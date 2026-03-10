# PuryFi Plugin SDK

A TypeScript SDK for building plugins for the PuryFi browser extension. Provides typed message sending and receiving for internal state access, media processing, and more.

## Table of Contents

- [How Communication Works](#how-communication-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Intents](#intents)
- [Connection Events](#connection-events)
- [Sending Messages](#sending-messages)
- [Plugin Manifest](#plugin-manifest)
- [Custom Configuration](#custom-configuration)
- [Chromium Bridge Setup](#chromium-bridge-setup)
- [Complete Example](#complete-example)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)

## How Communication Works

There are two kinds of plugins, browser extension plugins and WebSocket plugins. Building a plugin starts by deciding which kind is right for your goals.

**Browser extension plugins** are other browser extensions installed in the same browser as PuryFi. Communication with these on Firefox uses the browser's runtime messaging API, and on Chromium, a BroadcastChannel bridge through an iframe. See [Chromium Bridge Setup](#chromium-bridge-setup) for additional steps required on Chromium and the reason for these.

**WebSocket plugins** are any program, local or remote, capable of opening a WebSocket server for PuryFi to connect and communicate through. The reason the typical client/server relationship is inverted in this case is that browsers do not provide extensions with an API for opening WebSocket servers.

All messages use [msgpack](https://msgpack.org/) encoding.

## Installation

```bash
npm install @pury-fi/plugin-sdk
```

The SDK ships three entry points:

| Import                                  | Use                                                                 |
| --------------------------------------- | ------------------------------------------------------------------- |
| `@pury-fi/plugin-sdk`                   | Core types and `Connection`                                         |
| `@pury-fi/plugin-sdk/websocket`         | `WebSocketServer` upstream for WebSocket plugins                    |
| `@pury-fi/plugin-sdk/browser-extension` | `BrowserExtensionConnection` upstream for browser extension plugins |

## Quick Start

### Step 1 — Open a Connection

Open a connection to PuryFi for your plugin kind.

**WebSocket:**

```typescript
import * as SDK from "@pury-fi/plugin-sdk/websocket";

// Open a WebSocket server at a given port for PuryFi to connect to.
const server = new SDK.WebSocketServer(8080);

// Wait for a connection.
server.once("connection", (connection) => {
   // Wait for the connection to open.
   connection.once("open", () => {
      // The connection to PuryFi is now open.
   });
});
```

**Browser Extension:**

```typescript
import * as SDK from "@pury-fi/plugin-sdk/browser-extension";

// Create a connection to PuryFi in the same browser.
const connection = new SDK.BrowserExtensionConnection();

// Wait for the connection to open.
connection.once("open", () => {
   // The connection to PuryFi is now open.
});
```

### Step 2 — Handle the Handshake

Shortly after the connection opens, PuryFi sends a `ready` message containing its version and API version. Respond to this message to confirm compatibility. Responses are sent by simply returning on the message handler.

```typescript
// ...

// Wait for the ready message.
connection.once("message", "ready", (payload) => {
   // Delegate responding to the connection itself. The connection will return a error response if the API version is of a different major than the SDK was built for, which should be the correct course of action in the majority of cases.
   // Note that choosing to not delegate and instead respond yourself is also an option.
   return connection.handleReadyMessage(payload);
});
```

### Step 3 — Send a Manifest and Configuration

Optionally, send a manifest and an user-adjustable configuration. These can be sent at any time, any number of times, not just in between these steps.

```typescript
// ...

// Declare and send a manifest.
let manifest: SDK.PluginManifest = {
   name: "My Plugin",
   version: "1.0.0",
   description: "Does useful things",
   author: null,
   website: null,
};
await connection.sendMessage("setManifest", { manifest });

// Declare and send a configuration.
let configuration: SDK.PluginConfiguration = {
   threshold: {
      value: 0.8,
      type: "number",
      name: "Detection Threshold",
   },
};
await connection.sendMessage("setConfiguration", { configuration });

// Handle configuration change events.
connection.on("message", "configurationChange", (payload) => {
   // Assign the new configuration.
   configuration = payload.configuration;
});
```

### Step 4 — Request Intents

Plugins need to be granted intents to access most of the API. Get the intents your plugin has been granted in the past, if there are intents you desire and have not been granted, request them and wait for them to be granted. Like with sending a manifest and configuration, this can be done at any point, any number of times, not just between these steps. See [Intents](#intents) for the full list of intents and their description.

```typescript
// ...

// Declare your desired intents.
const intents: SDK.PluginIntent[] = ["readEnabled", "readWBlistConfiguration"];

// Get the intents that have been granted in the past.
const { intents: grantedIntents } = await connection
   .sendMessage("getIntents", {})
   .then((res) => {
      // Throw if we get an error response.
      if (res.type === "error") {
         throw new Error(`Failed to get intents: ${res.message}`);
      }
      return res;
   });

// Check if any desired intents have not been granted.
if (!intents.every((intent) => grantedIntents.includes(intent))) {
   // Request the desired intents.
   await connection.sendMessage("requestIntents", { intents });

   // Wait for intents to be granted.
   await new Promise<void>(async (resolve) => {
      connection.on(
         "message",
         "intentsGrant",
         function listener({ intents: granted }) {
            // Check if all desired intents have been granted, and if so, proceed.
            if (intents.every((i) => granted.includes(i))) {
               connection.off("message", "intentsGrant", listener);
               resolve();
            }
         }
      );
   });
}

// All desired intents are now granted.
```

If you require so, you may also get the intents requested and not yet granted.

```typescript
// ...

// Get the intents that have been requested and not yet granted.
const { pendingIntents } = await connection
   .sendMessage("getPendingIntents", {})
   .then((res) => {
      // Throw if we get an error response.
      if (res.type === "error") {
         throw new Error(`Failed to get pending intents: ${res.message}`);
      }
      return res;
   });
```

### Done

After this point you may implement the main functionality of your plugin, remembering to update your desired plugins as needed and reacting to configuration changes if necessary.

Refer to [API Reference](#api-reference) for detailed documentation, and to [Examples](#examples) for complete example plugins.

## Intents

Refer to [Quick Start](#quick-start) for how and when to request intents. This is the full list of intents and their description:

| Intent                     | Description                                 |
| -------------------------- | ------------------------------------------- |
| `readEnabled`              | Read PuryFi's enabled/disabled state        |
| `writeEnabled`             | Change PuryFi's enabled/disabled state      |
| `readLockConfiguration`    | Read lock settings                          |
| `writeLockConfiguration`   | Modify lock settings                        |
| `readWBlistConfiguration`  | Read whitelist/blacklist configuration      |
| `writeWBlistConfiguration` | Modify whitelist/blacklist configuration    |
| `readUser`                 | Read the current user's profile information |
| `readMediaProcesses`       | Receive real-time media scan events         |
| `requestMediaProcesses`    | Scan and censor images through PuryFi       |

### Message Events

Listen for specific incoming message types using the three-argument form of `on`:

```typescript
connection.on("message", "configurationChange", (payload) => {
   console.log("New configuration:", payload.configuration);
});

connection.on("message", "stateChange", (payload) => {
   console.log(`${payload.path} changed to`, payload.value);
});

connection.on("message", "staticMediaScan", (payload) => {
   console.log("Detected objects:", payload.objects);
});

connection.on("message", "intentsGrant", (payload) => {
   console.log("Granted intents:", payload.intents);
});
```

### Listener Methods

| Method                            | Description                             |
| --------------------------------- | --------------------------------------- |
| `on(event, listener)`             | Add a persistent listener               |
| `on("message", type, listener)`   | Add a persistent typed message listener |
| `once(event, listener)`           | Add a one-time listener                 |
| `once("message", type, listener)` | Add a one-time typed message listener   |
| `off(event, listener)`            | Remove a listener                       |
| `off("message", type, listener)`  | Remove a typed message listener         |

Message listeners receive `(payload, currentResponse)` and can return a value to send back to PuryFi for messages that expect a response (like `ready`).

## Sending Messages

Use `connection.sendMessage(type, payload)` to send messages to PuryFi. All calls return a typed promise that resolves with either `{ type: "ok", ... }` or `{ type: "error", name, message }`.

### Manifest & Configuration

```typescript
await connection.sendMessage("setManifest", { manifest });
await connection.sendMessage("setConfiguration", { configuration });

const manifestRes = await connection.sendMessage("getManifest", {});
const configRes = await connection.sendMessage("getConfiguration", {});
```

### State

Read, write, and watch PuryFi's internal state using dot-separated paths. See the [State API Reference](docs/STATE_API.md) for all available paths, types, and access levels.

```typescript
// Get
const res = await connection.sendMessage("getState", { path: "enabled" });

// Set
await connection.sendMessage("setState", {
   path: "enabled",
   value: true,
});

// Start watching
await connection.sendMessage("watchState", { path: "enabled" });
connection.on("message", "stateChange", (payload) => {
   console.log(`${payload.path} changed to`, payload.value);
});

// Stop watching
await connection.sendMessage("unwatchState", { path: "enabled" });
```

### Media Processing

Scan and censor images through PuryFi's detection engine. See the [Media Processing API Reference](docs/MEDIA_API.md) for the full API, detection object format, and label reference.

```typescript
// Scan an image
const scanRes = await connection.sendMessage("scanStaticMedia", {
   image: imageBytes, // Uint8Array
});

// Censor an image (null = auto-detect what to censor)
const censorRes = await connection.sendMessage("censorStaticMedia", {
   image: imageBytes,
   objects: null,
});

// Watch for live scan events
await connection.sendMessage("watchStaticMediaScans", {});
connection.on("message", "staticMediaScan", (payload) => {
   console.log("Detected:", payload.objects);
});
```

### Lock Management

```typescript
await connection.sendMessage("enterLockPassword", {
   secret: "the-password",
});

await connection.sendMessage("enterLockEmergencyServerToken", {
   emergencyServerToken: 123456,
});
```

## Plugin Manifest

The `PluginManifest` describes your plugin to PuryFi. All fields are `string | null`.

| Field         | Description        |
| ------------- | ------------------ |
| `name`        | Display name       |
| `version`     | Semantic version   |
| `description` | Short description  |
| `author`      | Author name        |
| `website`     | Plugin website URL |

## Custom Configuration

Define settings that users can adjust in the PuryFi UI. Each field in the `PluginConfiguration` record has a `value`, `type`, and `name`:

```typescript
const configuration: PluginConfiguration = {
   myField: {
      value: 42, // default value
      type: "number", // "string" | "number" | "boolean"
      name: "My Setting", // display name shown to the user
   },
};
```

When the user changes a setting, your plugin receives a `configurationChange` message with the full updated configuration:

```typescript
connection.on("message", "configurationChange", (payload) => {
   configuration = payload.configuration;
});
```

## Chromium Bridge Setup

> [!CAUTION]
> Chromium's runtime messaging JSON-encodes message payloads, which degrades performance for binary data like images. A bridge workaround is required for Chromium-based browsers. If your extension targets both Firefox and Chromium, you can still apply these steps — Firefox ignores the bridge at runtime.

1. Copy `chromium/bridge.html` to your extension's public/output directory
2. Copy `chromium/bridge.js` to your extension's source directory — the `<script>` tag in `bridge.html` must be able to load it. Do not modify the bridge files
3. Add the bridge files as web-accessible resources in your `manifest.json`:

```json
{
   "web_accessible_resources": [
      {
         "resources": ["bridge.html", "bridge.js"],
         "matches": ["<all_urls>"]
      }
   ]
}
```

PuryFi loads `bridge.html` in an offscreen iframe and transfers a MessageChannel port to your extension. This port replaces Chromium's runtime API for binary messaging.

See the [ChromiumPlugin example](examples/ChromiumPlugin) for a working implementation.

## Complete Example

A full WebSocket plugin that connects, handshakes, sets up configuration, and handles intents:

```typescript
import PuryFiSocket from "@pury-fi/plugin-sdk/socket";
import { PuryFiConnection, PuryFiConnectionError } from "@pury-fi/plugin-sdk";
import type {
   PluginManifest,
   PluginConfiguration,
   Intent,
} from "@pury-fi/plugin-sdk";

const upstream = new PuryFiSocket(8080);
const connection = new PuryFiConnection(upstream);

upstream.setDebug(true);
connection.setDebug(true);

const manifest: PluginManifest = {
   name: "Example Plugin",
   version: "1.0.0",
   description: "An example plugin",
   author: null,
   website: null,
};

let configuration: PluginConfiguration = {
   exampleField: {
      value: 0,
      type: "number",
      name: "Example field",
   },
};

const intents: Intent[] = [];

connection.on("error", (error: PuryFiConnectionError) => {
   console.log(error.message);
});

connection.once("open", async () => {
   // Handle handshake
   const { version, apiVersion } = await new Promise<{
      version: string;
      apiVersion: string;
   }>((resolve) => {
      connection.on("message", "ready", (payload) => {
         const response = connection.handleReadyMessage(payload);
         if (response.type === "ok") resolve(payload);
         return response;
      });
   });

   console.log(`PuryFi ${version} (API ${apiVersion}) connected`);

   // Send manifest and configuration
   await connection.sendMessage("setManifest", { manifest }).then((res) => {
      if (res.type === "error") throw new Error("Failed to set manifest");
   });

   await connection
      .sendMessage("setConfiguration", { configuration })
      .then((res) => {
         if (res.type === "error")
            throw new Error(`Failed to set configuration: ${res.message}`);
      });

   // Handle configuration changes from the user
   connection.on("message", "configurationChange", (payload) => {
      console.log("Configuration changed:", payload.configuration);
      configuration = payload.configuration;
   });

   // Request intents if needed
   const response = await connection
      .sendMessage("getIntents", {})
      .then((res) => {
         if (res.type === "error")
            throw new Error(`Failed to get intents: ${res.message}`);
         return res;
      });

   if (!intents.every((intent) => response.intents.includes(intent))) {
      await new Promise<void>(async (resolve) => {
         connection.on(
            "message",
            "intentsGrant",
            function listener({ intents: granted }) {
               if (intents.every((i) => granted.includes(i))) {
                  console.log("Required intents granted");
                  connection.off("message", "intentsGrant", listener);
                  resolve();
               }
            }
         );

         await connection.sendMessage("requestIntents", { intents });
      });
   }

   console.log("Plugin fully initialized");
});

connection.on("close", () => {
   console.log("PuryFi disconnected");
});
```

## API Reference

Detailed reference documentation for specific subsystems:

- [**State API Reference**](docs/STATE_API.md) — all state paths, types, access levels, reading, writing, and watching state
- [**Media Processing API Reference**](docs/MEDIA_API.md) — scanning, censoring, live scan events, detection objects, and label reference

## Examples

Working example projects are included in the `examples/` directory:

- [**WebSocket**](examples/WebSocket) — standalone Node.js plugin using `PuryFiSocket`. Demonstrates state reading, writing, and watching (enabled, lock configuration, whitelist/blacklist), configuration change handling, and auto-enable-on-lock logic.
- [**ChromiumPlugin**](examples/ChromiumPlugin) — browser extension plugin using `PuryFiBrowser` with the Chromium bridge. Demonstrates live media scan monitoring, detection filtering by confidence threshold, per-label statistics tracking, and whitelist/blacklist state reading.

## Development

The SDK supports both ESM and CommonJS.

### Building

```bash
npm run build        # Build both ESM and CJS
npm run build:esm    # Build ESM only
npm run build:cjs    # Build CJS only
npm run watch        # Watch mode (ESM only)
```
