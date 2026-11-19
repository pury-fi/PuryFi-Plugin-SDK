# PuryFi Plugin SDK

[![npm version](https://img.shields.io/npm/v/@pury-fi/plugin-sdk.svg)](https://www.npmjs.com/package/@pury-fi/plugin-sdk)

A TypeScript SDK for building plugins for the PuryFi browser extension. Provides typed message sending and receiving for state access, media processing, and more.

> [!IMPORTANT]
> The plugin SDK is compatible with PuryFi 0.8.6.0 and above. Advanced capabilities such as media censor hooks, custom censor modes, and setting synchronization require PuryFi 0.8.8.0 or newer. If you are interested in joining the beta, please head over to the [Discord server](https://discord.gg/9aBBJNEJGC) to request access.

## Terms and Conditions
Please read our [Terms of Service for Plugins](https://pury.fi/site/puryfi-plugin-terms-of-service). 

## Table of Contents

- [How Communication Works](#how-communication-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Media Censor Hooks](#media-censor-hooks)
- [Settings Export and Import](#settings-export-and-import)
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

### Step 1 — Register the plugin

Before anything else, you need to register your plugin on PuryFi. Navigate to the Plugins tab on the options page of PuryFi, under the "Register new plugin" section, depending on your plugin kind either select WebSocket and enter the URL of the WebServer your plugin will open, which if you follow the next step as is will be `ws://localhost:8080`, or select Browser Extension and choose your extension from the dropdown.

Any users of your plugin will also need to register your plugin on their PuryFi in the same way, so if you are developing for release, you should provide instructions for this step to your users.

### Step 2 — Open a Connection

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

### Step 3 — Handle the Handshake

Shortly after the connection opens, PuryFi sends a `ready` message containing its version, the API version and the unique Instance ID of the PuryFi installation. Respond to this message to confirm compatibility. Responses are sent by returning on the message handler.

```typescript
// ...

// Wait for the ready message.
await new Promise<void>((resolve) => {
   connection.once("message", "ready", (payload) => {
      // Delegate responding to the connection itself. The connection will return a error response if the API version is of a different major than the SDK was built for, which should be the correct course of action in the majority of cases.
      // Note that choosing to not delegate and instead respond yourself is also an option.
      const res = connection.handleReadyMessage(payload);
      if (res.type === "ok") {
         resolve();
      }
      return res;
   });
});
```

### Step 4 — Send a Manifest and Configuration

Optionally, send a manifest and a user-adjustable configuration for your plugin. These can be sent at any time, any number of times, not just in between these steps. Plugins can also register custom censor modes or rich configuration inputs (such as select dropdowns, multi-select, color pickers, and action buttons).

```typescript
// ...

// Declare and send a manifest (optionally defining custom censor modes).
let manifest: SDK.PluginManifest = {
   name: "Example Censor Plugin",
   version: "1.0.0",
   description: "An example plugin adding a custom censor mode",
   author: "Community Developer",
   website: null,
   censorModes: [
      {
         id: "custom-blur",
         name: "Custom Blur Mode",
         tooltip: "Applies custom blurring to detected content",
         supportsImage: true,
         supportsVideo: true,
         supportsMixedMode: true,
      },
   ],
};
await connection.sendMessage("setPluginManifest", { manifest });

// Declare and send a configuration with diverse UI controls.
let configuration: SDK.PluginConfiguration = {
   strength: {
      name: "Censor Strength",
      type: "number",
      value: 15,
      description: "Intensity of the censoring filter",
   },
   style: {
      name: "Filter Style",
      type: "select",
      value: "gaussian",
      options: [
         { label: "Gaussian Blur", value: "gaussian" },
         { label: "Box Blur", value: "box" },
      ],
   },
};
await connection.sendMessage("setPluginConfiguration", { configuration });

// Handle configuration change events.
connection.on("message", "configurationChange", (payload) => {
   // Assign the new configuration.
   configuration = payload.configuration;
});
```

### Step 5 — Request Intents

Plugins need to be granted intents to access most of the API. Available intents include state access (`readEnabledState`, `writeEnabledState`, `readLockConfigurationState`, etc.), media processing (`requestMediaProcesses`, `readMediaProcesses`), and real-time intercepting (`requestMediaCensorHooks`, `readMediaSource`, `readMediaContent`, `readPureVisionState`).

Get the intents your plugin has been granted in the past, if there are intents you desire and have not been granted, request them and wait for them to be granted. Like with sending a manifest and configuration, this can be done at any point, any number of times, not just between these steps. Refer to [Plugin Intent](docs/README.md#pluginintent) for a full list of intents and their description.

```typescript
// ...

// Declare your desired intents.
const intents: SDK.PluginIntent[] = [
   "readEnabledState",
   "writeEnabledState",
   "requestMediaCensorHooks",
];

// Get the intents that have been granted in the past.
const { intents: grantedIntents } = await connection
   .sendMessage("getPluginIntents", {})
   .then((res) => {
      // Throw if we get an error response.
      if (res.type === "error") {
         throw new Error(`Failed to get plugin intents: ${res.message}`);
      }
      return res;
   });

// Check if any desired intents have not been granted.
if (!intents.every((intent) => grantedIntents.includes(intent))) {
   // Request the desired intents.
   await connection.sendMessage("requestPluginIntents", { intents });

   // Wait for intents to be granted.
   await new Promise<void>((resolve) => {
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
   .sendMessage("getPendingPluginIntents", {})
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

For documentation, refer to [Documentation](/docs/README.md), and for entire example plugins, refer to [Examples](/examples/README.md).

## Media Censor Hooks

Starting with PuryFi 0.8.8.0, plugins can register custom censor modes or hook directly into PuryFi's censoring pipeline (supporting images, video frames, and Mixed Mode).

### 1. Subscribe to Hooks

With the `requestMediaCensorHooks` intent granted, subscribe to hook events:

```typescript
await connection.sendMessage("subscribeToMediaCensorHooks", {
   stage: "before", // "before" internal censoring (e.g. to replace it) or "after"
   onlyIfObjectsDetected: true,
   targets: ["image"],
   timeout: 8000,
});
```

### 2. Handle Intercepted Media

Incoming `mediaCensorHookRequest` message listeners can be `async`. Return `{ type: "ok", image: Uint8Array, skipInternalCensoring: true }` to deliver modified media, or `{ type: "pass" }` to leave it unchanged:

```typescript
connection.on("message", "mediaCensorHookRequest", async (payload) => {
   const { image, objects, width, height, stage } = payload;

   if (objects.length === 0) {
      return { type: "pass" };
   }

   // Process the image bytes (e.g. canvas, WebGL, AI inpainting)
   const modifiedImage = await myCustomCensorPipeline(image, objects);

   return {
      type: "ok",
      image: modifiedImage,
      skipInternalCensoring: true, // Prevents default blur/pixelate from running on top
   };
});
```

## Settings Export and Import

When users backup or synchronize their PuryFi profiles, PuryFi can export and import your plugin's configuration:

```typescript
// Provide settings during profile export
connection.on("message", "exportPluginSettings", () => {
   return {
      settings: currentSettings,
   };
});

// Restore settings when a profile is imported
connection.on("message", "importPluginSettings", ({ settings }) => {
   Object.assign(currentSettings, settings);
   return { type: "ok" };
});
```

## Chromium Bridge Setup

> Chromium's runtime messaging JSON-encodes message payloads, which degrades performance for binary data like images. A bridge workaround is required for Chromium-based browsers. If your extension targets both Firefox and Chromium, you can still apply these steps as the SDK ignores the bridge on Firefox at runtime.

1. Copy `chromium/bridge.html` to your extension's root directory
2. Copy `chromium/bridge.js` to your extension's root directory — the `<script>` tag in `bridge.html` must be able to load it. Do not modify the bridge files
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

Refer to [Examples](/examples/README.md) for entire examples of browser extension plugins using the bridge.

## Development

The SDK supports both ESM and CommonJS.

### Building

```bash
npm run build        # Build both ESM and CJS
npm run build:esm    # Build ESM only
npm run build:cjs    # Build CJS only
npm run watch        # Watch mode (ESM only)
```
