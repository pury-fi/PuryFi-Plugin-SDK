# PuryFi Plugin SDK

A TypeScript SDK for building plugins for the PuryFi browser extension. Provides typed message sending and receiving for state access, media processing, and more.

## Table of Contents

- [How Communication Works](#how-communication-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Chromium Bridge Setup](#chromium-bridge-setup)
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

Shortly after the connection opens, PuryFi sends a `ready` message containing its version and API version. Respond to this message to confirm compatibility. Responses are sent by returning on the message handler.

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

Plugins need to be granted intents to access most of the API. Get the intents your plugin has been granted in the past, if there are intents you desire and have not been granted, request them and wait for them to be granted. Like with sending a manifest and configuration, this can be done at any point, any number of times, not just between these steps. Refer to [Intents](#intents) for a full list of intents and their description.

```typescript
// ...

// Declare your desired intents.
const intents: SDK.PluginIntent[] = ["readEnabledState", "writeEnabledState"];

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
         function listener({ intents: grantedIntents }) {
            // Check if all desired intents have been granted, and if so, proceed.
            if (intents.every((intent) => grantedIntents.includes(intent))) {
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

Refer to the [Documentation](/docs/README.md) for detailed documentation, and to the `examples` folder for complete example plugins.

## Chromium Bridge Setup

> Chromium's runtime messaging JSON-encodes message payloads, which degrades performance for binary data like images. A bridge workaround is required for Chromium-based browsers. If your extension targets both Firefox and Chromium, you can still apply these steps as the SDK ignores the bridge on Firefox at runtime.

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

See the `examples` folder for entire examples of browser extension plugins using the bridge.

## Development

The SDK supports both ESM and CommonJS.

### Building

```bash
npm run build        # Build both ESM and CJS
npm run build:esm    # Build ESM only
npm run build:cjs    # Build CJS only
npm run watch        # Watch mode (ESM only)
```
