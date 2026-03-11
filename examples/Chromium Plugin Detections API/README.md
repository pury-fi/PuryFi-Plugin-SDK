# Chromium Plugin — Detections API

A working example of a Chromium browser extension that uses the PuryFi Plugin SDK to monitor live media scans and log detection statistics.

## What It Does

This plugin connects to PuryFi and demonstrates the **Media Processing API**:

- **Watches live media scans** — subscribes to `watchStaticMediaScans` to receive detection results in real time as PuryFi processes images on the page.
- **Filters detections** — applies a user-configurable confidence score threshold, with an option to include or exclude face detections.
- **Tracks statistics** — counts total scans and detections, and prints a per-label summary every 10 scans.
- **Reads state** — fetches the current enabled status, user profile, and whitelist/blacklist configuration on startup.
- **Watches state** — monitors the `enabled` path and logs when PuryFi is toggled on or off.

## Intents Used

| Intent                         | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `readEnabledState`             | Read and watch the enabled/disabled state |
| `readWBlistConfigurationState` | Read whitelist/blacklist settings         |
| `readMediaProcessesState`      | Subscribe to live media scan results      |
| `readUserState`                | Read the current user profile             |

## Configuration Fields

The plugin exposes two user-editable settings in the PuryFi UI:

| Field            | Type    | Default | Description                                           |
| ---------------- | ------- | ------- | ----------------------------------------------------- |
| `scoreThreshold` | number  | `0.7`   | Minimum confidence score for a detection to be logged |
| `logFaces`       | boolean | `false` | Whether to include face detections in the output      |

## Running the Example

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build:**

   ```bash
   npm run build
   ```

3. **Load the extension** in Chrome/Edge:
   - Navigate to `chrome://extensions` (or `edge://extensions`)
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `build/` folder

4. Open the service worker console to see detection logs and statistics.

## Bridge Files

> **Important:** The `bridge.html` and `bridge.js` files handle binary messaging between the extension and PuryFi on Chromium. These files **must match the version of the SDK** you are using. When you update `@pury-fi/plugin-sdk`, copy the latest bridge files from the SDK's `chromium/` folder into your project:
>
> ```
> node_modules/@pury-fi/plugin-sdk/chromium/bridge.html → public/bridge.html
> node_modules/@pury-fi/plugin-sdk/chromium/bridge.js   → src/bridge.js
> ```
>
> Mismatched bridge files can cause silent connection failures.

## Key Code

The main logic lives in `src/background.ts`:

- Sets up the connection and handshake
- Subscribes to `watchStaticMediaScans` for live detection events
- Filters each scan's `objects` array by `score` and `label`
- Maps label IDs to human-readable names via the `Label` enum
- Accumulates per-label counts and prints periodic summaries

See the SDK's [Media API documentation](../../docs/MEDIA_API.md) for the full detection object structure, label mapping, and available scan methods.
