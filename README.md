# PuryFi Plugin SDK

A TypeScript SDK for building plugins that integrate with the PuryFi platform. This library provides WebSocket and Browser-Runtime based communication and plugin lifecycle management for seamless integration with PuryFi's browser extension.

## Features

- **WebSocket Communication**: Bidirectional communication with PuryFi via WebSocket
- **Browser Extension Communication**: Bidirectional communication with PuryFi via Browser Runtime
- **Plugin Configuration**: Define custom configuration fields for your plugin
- **Event System**: Listen to plugin lifecycle events (ready, config changes, errors, etc.)
- **Plugin Actions**: Execute actions on PuryFi through the SDK
- **TypeScript Support**: Full TypeScript support with type definitions

## Note about communication with PuryFi
Browsers do not allow extensions to open externally reachable ways of communication. To overcome this, PuryFi's plugin system turns the logic around. Technically, the plugin is the Server and PuryFi is the client. The SDK mainly takes care of handling this part, but especially for WebSocket based plugins, this can cause problems for the user when the plugin tries to bind to a port that is already in-use or does not have the required permissions on the operating system.

But it also comes with a positive side for developers. From a technical perspective, a WebSocket based plugin instance is able to work with multiple PuryFi connections over network at the same time. The SDK does not handle that use-case (yet) and always broadcasts to all connected PuryFi instances.

PuryFi uses the msgpack encoding for plugin communication.

## Installation

```bash
npm install @puryfi/puryfi-plugin-sdk
```

## Quick Start

### 1a. Create a WebSocket Connection

```typescript
import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";

const puryfiSocket = new PuryFiSocket(3000);
```

This creates a WebSocket server on port 3000 that listens for incoming PuryFi connections.

### 1b. Create a Browser Extension Connection

```typescript
import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/browser";

const puryfiBrowser = new PuryFiBrowser(3000);
```

This creates a browser runtime based connection for Firefox browsers and an iframe based connection for Chromium browsers

#### Chromium browsers

> [!CAUTION]
 Chromium's cross-plugin messaging behaves differently from Firefox by JSON encoding the message payload. Since this would introduce a big performance impact on binary data like pictures, a workaround that requires manual implementation is required. Follow the next steps carefully if you are using this SDK in a Chromium extension. If your extension is used on both browser platforms, you can still do the following steps. Firefox does not mind and the workaround will just not be used at runtime.

 1. Copy the `chromium/bridge.html` to the public directory of your extension
 2. Copy the `chromium/bridge.js` to the source directory of your extension. This can vary based on how your extension code is structured. The `<script>` tag in the bridge.html file needs to be able to load it. Do not modify the bridge files otherwise.
 3. Modify your `manifest.json` to include the following configuration. Again, the exact way of doing this might vary depending on if your extension exposes more web resources.
 ```json
 {
    "web_accessible_resources": [
        {
            "resources": ["bridge.html", "bridge.js"],
            "matches": ["<all_urls>"]
        }
  ],
 }
 ```

 This will make your extension expose our bridge.html as a web resource that PuryFi can load inside of an offscreen iframe element. Then PuryFi will move one end of a MessageChannel Port over to your extension via content message. This is then used instead of Chromium's own runtime API.



### 2. Initialize the SDK

```typescript
import { PuryFi } from "@puryfi/puryfi-plugin-sdk";

const puryfiSDK = new PuryFi(
    puryfiSocket, // alternatively the puryfiBrowser instance
    {
        name: "My Awesome Plugin",
        intents: ["detection", "lock-control", "purevision-control"],
        version: "1.0.0",
        description: "A plugin that does amazing things",
        author: "me of course"
    },
    { 
        // Custom configuration fields (optional)
        multiplier: { 
            value: 0.8, 
            valueType: "number", 
            displayName: "Time multiplication factor" 
        },
        enabled_feature_x: {
            value: true,
            valueType: "boolean",
            displayName: "Enable Plugin feature X"
        }
    }
);
```

## Configuration

### Plugin Configuration

The `PluginConfiguration` object defines basic plugin information:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name of your plugin |
| `version` | string | Yes | Semantic version of your plugin |
| `intents` | string[] | Yes | Array of plugin capabilities (e.g., `["detection"]`) |
| `description` | string | No | Short description of what your plugin does |
| `author` | string | No | Plugin author name |
| `website` | string | No | Plugin website URL |

#### Intents

Intents are PuryFi's access control. Everytime the connection handshake is done, your plugin will send PuryFi a list of its intents. On first-time handshake, the user will be asked to confirm them. If your intents change after the first-time handshake, PuryFi will refuse the connection. You should only specify the intents that you need for your plugin features. Some intents can cause a lot of traffic or allow deep control over PuryFi.

See the Intents documentation for what intents are available and what they do/allow you to do.

### Custom Configuration Fields

Define custom settings that users can configure in the PuryFi UI, so your plugin does not need its own UI (optional):

```typescript
{
    fieldName: {
        value: defaultValue,
        valueType: "string" | "number" | "boolean",
        displayName: "User Friendly Name"
    }
}
```

## Event Listeners

Register listeners for important plugin lifecycle events:

### Ready Event

Fired when the plugin connects to PuryFi and handshake is complete:

```typescript
puryfiSDK.on("ready", () => {
    console.log("Connected to PuryFi!");
    // You can now use actions and receive events
    puryfiSDK.actions.connectPurevision();
});
```

### Config Event

Fired when a custom plugin configuration field is changed in the PuryFi UI:

```typescript
puryfiSDK.on("config", (fieldName: string, value: any) => {
    console.log(`Config field ${fieldName} changed to ${value}`);
});
```

### Error Event

Fired when an error occurs in PuryFi or the upstream connection:

```typescript
puryfiSDK.on("error", (error: string) => {
    console.error("Error from PuryFi:", error);
});
```

### Close Event

Fired when the upstream connection to PuryFi is closed:

```typescript
puryfiSDK.on("close", () => {
    console.log("Connection to PuryFi closed.");
});
```

### Event Message Event

Fired when event messages are received from PuryFi:

```typescript
puryfiSDK.on("event", (message) => {
    console.log("Received event:", message);
});
```

## Event Listener Methods

- `on(event, callback)` - Add an event listener
- `off(event, callback)` - Remove an event listener
- `once(event, callback)` - Add a one-time event listener (automatically removed after firing)

## Plugin Actions

Access available plugin actions through `puryfiSDK.actions`:

```typescript
puryfiSDK.actions.connectPurevision();
```

See the actions documentation for a complete list of available actions.

## Complete Example

```typescript
import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import { PuryFi } from "@puryfi/puryfi-plugin-sdk";

// Create WebSocket server
const puryfiSocket = new PuryFiSocket(3000);

// Initialize SDK
const puryfiSDK = new PuryFi(
    puryfiSocket,
    {
        name: "Test Plugin",
        intents: ["detection"],
        version: "1.0.0",
        description: "A test plugin for PuryFi",
    },
    { 
        cool: { 
            value: true, 
            valueType: "boolean", 
            displayName: "Cool Setting" 
        } 
    }
);

// Listen for ready event
puryfiSDK.on("ready", () => {
    puryfiSDK.actions.connectPurevision();
});

// Listen for config changes
puryfiSDK.on("config", (fieldName: string, value: any) => {
    console.log(`Config field ${fieldName} changed to ${value}`);
});

// Listen for errors
puryfiSDK.on("error", (error: string) => {
    console.error("Error from PuryFi:", error);
}); 

// Listen for connection close
puryfiSDK.on("close", () => {
    console.log("Connection to PuryFi closed.");
});

// Listen for events
puryfiSDK.on("event", (message) => {
    console.log("Received event:", message);
});
```

## Development

This SDK supports both CommonJS and ESM module formats.

### Building
Run `npm run build` to create production builds for esm and cjs.
For technical reasons, `npm run watch` will only build esm.