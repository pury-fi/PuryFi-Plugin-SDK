# PuryFi Plugin SDK

A TypeScript SDK for building plugins that integrate with the PuryFi browser extension. Provides WebSocket and browser-runtime based communication, typed message handling, state management, and media processing capabilities.

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
- [Debugging](#debugging)
- [Error Handling](#error-handling)
- [Complete Example](#complete-example)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)

## How Communication Works

Browsers do not allow extensions to open externally reachable connections. To work around this, PuryFi's plugin system inverts the typical client/server relationship — your plugin acts as the server and PuryFi connects to it as a client. The SDK handles this transparently.

For **WebSocket plugins**, this means the plugin binds to a local port. This can cause issues if the port is already in use or the OS restricts binding. On the upside, a WebSocket plugin can technically serve multiple PuryFi instances over the network (the SDK currently broadcasts to all connected instances).

For **browser extension plugins**, communication uses the browser's runtime messaging API (Firefox) or a BroadcastChannel bridge through an iframe (Chromium). See [Chromium Bridge Setup](#chromium-bridge-setup) for additional steps required on Chromium.

All messages use [msgpack](https://msgpack.org/) encoding.

## Installation

```bash
npm install @puryfi/puryfi-plugin-sdk
```

The SDK ships three entry points:

| Import | Use |
|--------|-----|
| `@puryfi/puryfi-plugin-sdk` | Core types and `PuryFiConnection` |
| `@puryfi/puryfi-plugin-sdk/socket` | `PuryFiSocket` upstream for standalone plugins |
| `@puryfi/puryfi-plugin-sdk/browser` | `PuryFiBrowser` upstream for browser extension plugins |

## Quick Start

### Step 1 — Create an Upstream Connection

Choose the upstream that matches your plugin type.

**WebSocket (standalone plugin):**

```typescript
import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";

const upstream = new PuryFiSocket(8080);
```

Creates a WebSocket server on port 8080 that PuryFi connects to.

Optional second argument for server options:

```typescript
const upstream = new PuryFiSocket(8080, {
   maxPayload: 128 * 1024 * 1024, // max message size in bytes (default: 128 MB)
   perMessageDeflate: false,       // enable per-message compression (default: false)
});
```

**Browser Extension:**

```typescript
import PuryFiBrowser from "@puryfi/puryfi-plugin-sdk/browser";

const upstream = new PuryFiBrowser();
```

Uses runtime messaging on Firefox and a BroadcastChannel bridge on Chromium. No port argument is needed.

### Step 2 — Create a Connection

```typescript
import { PuryFiConnection } from "@puryfi/puryfi-plugin-sdk";

const connection = new PuryFiConnection(upstream);
```

### Step 3 — Handle the Handshake

When PuryFi connects, it sends a `ready` message containing its version and API version. Your plugin must respond to confirm compatibility, then send its manifest and configuration.

```typescript
import type { PluginManifest, PluginConfiguration } from "@puryfi/puryfi-plugin-sdk";

const manifest: PluginManifest = {
   name: "My Plugin",
   version: "1.0.0",
   description: "Does useful things",
   author: null,
   website: null,
};

const configuration: PluginConfiguration = {
   threshold: {
      value: 0.8,
      type: "number",
      name: "Detection Threshold",
   },
};

connection.once("open", async () => {
   // Wait for the ready message and validate API compatibility
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

   // Send plugin metadata and settings
   await connection.sendMessage("setManifest", { manifest });
   await connection.sendMessage("setConfiguration", { configuration });
});
```

### Step 4 — Request Intents

Intents are permissions your plugin needs. The user must approve them in the PuryFi UI. See [Intents](#intents) for the full list.

```typescript
import type { Intent } from "@puryfi/puryfi-plugin-sdk";

const intents: Intent[] = ["readEnabled", "readWBlistConfiguration"];

// Check which intents are already granted
const response = await connection.sendMessage("getIntents", {});

if (response.type === "error") {
   throw new Error(`Failed to get intents: ${response.message}`);
}

if (!intents.every((i) => response.intents.includes(i))) {
   // Request the missing intents and wait for the user to approve
   await new Promise<void>(async (resolve) => {
      connection.on("message", "intentsGrant", function listener({ intents: granted }) {
         if (intents.every((i) => granted.includes(i))) {
            connection.off("message", "intentsGrant", listener);
            resolve();
         }
      });

      await connection.sendMessage("requestIntents", { intents });
   });
}
```

You can also check which intents are still pending user approval:

```typescript
const pending = await connection.sendMessage("getPendingIntents", {});
if (pending.type === "ok") {
   console.log("Waiting for user to approve:", pending.pendingIntents);
}
```

## Intents

Intents are PuryFi's permission system. On first connection, the user is prompted to approve your plugin's intents. If your intents change after the first handshake, PuryFi refuses the connection. Only request what you need — some intents generate significant traffic or grant deep control.

| Intent | Description |
|--------|-------------|
| `readEnabled` | Read PuryFi's enabled/disabled state |
| `writeEnabled` | Change PuryFi's enabled/disabled state |
| `readLockConfiguration` | Read lock settings |
| `writeLockConfiguration` | Modify lock settings |
| `readWBlistConfiguration` | Read whitelist/blacklist configuration |
| `writeWBlistConfiguration` | Modify whitelist/blacklist configuration |
| `readUser` | Read the current user's profile information |
| `readMediaProcesses` | Receive real-time media scan events |
| `requestMediaProcesses` | Scan and censor images through PuryFi |

## Connection Events

`PuryFiConnection` emits lifecycle events and typed message events.

### Lifecycle Events

```typescript
connection.on("open", () => {
   console.log("PuryFi connected");
});

connection.on("close", () => {
   console.log("PuryFi disconnected");
});

connection.on("error", (error: PuryFiConnectionError) => {
   console.error(error.name, error.message);
});
```

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

| Method | Description |
|--------|-------------|
| `on(event, listener)` | Add a persistent listener |
| `on("message", type, listener)` | Add a persistent typed message listener |
| `once(event, listener)` | Add a one-time listener |
| `once("message", type, listener)` | Add a one-time typed message listener |
| `off(event, listener)` | Remove a listener |
| `off("message", type, listener)` | Remove a typed message listener |

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
// Read
const res = await connection.sendMessage("getState", { path: "enabled" });

// Write
await connection.sendMessage("setState", {
   path: "wblistConfiguration.mode",
   value: "whitelist",
});

// Watch for changes
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

| Field | Description |
|-------|-------------|
| `name` | Display name |
| `version` | Semantic version |
| `description` | Short description |
| `author` | Author name |
| `website` | Plugin website URL |

## Custom Configuration

Define settings that users can adjust in the PuryFi UI. Each field in the `PluginConfiguration` record has a `value`, `type`, and `name`:

```typescript
const configuration: PluginConfiguration = {
   myField: {
      value: 42,           // default value
      type: "number",      // "string" | "number" | "boolean"
      name: "My Setting",  // display name shown to the user
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

## Debugging

Enable debug logging on both the upstream and the connection:

```typescript
upstream.setDebug(true);
connection.setDebug(true);
```

This logs connection lifecycle events and message traffic to the console, prefixed with `[PuryFi SDK]`.

## Error Handling

`sendMessage` returns a typed response. Always check the response type:

```typescript
const res = await connection.sendMessage("getState", { path: "enabled" });
if (res.type === "error") {
   console.error(`${res.name}: ${res.message}`);
} else {
   console.log("Value:", res.value);
}
```

Error names vary by message type but include:

| Error Name | Description |
|------------|-------------|
| `internalError` | Something went wrong inside PuryFi |
| `invalidMessage` | The message payload was malformed |
| `missingIntents` | The plugin hasn't been granted the required intents |
| `unavailablePath` | The state path doesn't exist or is inaccessible |
| `invalidImage` | The image data was invalid (media messages) |
| `incompatibleApiVersion` | Version mismatch during handshake |

## Complete Example

A full WebSocket plugin that connects, handshakes, sets up configuration, and handles intents:

```typescript
import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import {
   PuryFiConnection,
   PuryFiConnectionError,
} from "@puryfi/puryfi-plugin-sdk";
import type {
   PluginManifest,
   PluginConfiguration,
   Intent,
} from "@puryfi/puryfi-plugin-sdk";

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
   const response = await connection.sendMessage("getIntents", {}).then((res) => {
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