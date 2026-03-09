# Chromium Plugin Boilerplate

A ready-to-use template for building a Chromium browser extension plugin with the PuryFi Plugin SDK. Copy this folder to start developing your own plugin.

## Getting Started

1. **Copy this folder** to your own project directory.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start developing** with live rebuilds:

   ```bash
   npm run watch
   ```

4. **Load the extension** in Chrome/Edge:
   - Navigate to `chrome://extensions` (or `edge://extensions`)
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `build/` folder

5. Open the extension's service worker console (click "Inspect views: service worker" on the extensions page) to see debug output.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run watch` | Build in development mode with file watching |
| `npm run build` | Production build |
| `npm run pack` | Zip the `build/` folder for web store upload |
| `npm run repack` | Build + pack in one step |
| `npm run format` | Format source files with Prettier |

## Project Structure

```
src/
  background.ts   — Extension service worker (your plugin logic goes here)
  bridge.js       — Bridge script for Chromium binary messaging
public/
  manifest.json   — Chrome extension manifest (v3)
  bridge.html     — Bridge page loaded as an iframe
  icons/          — Extension icons
config/
  webpack.common.js — Shared webpack configuration
  webpack.config.js — Entry points and dev/prod settings
  paths.js          — Build path definitions
pack.js            — Packages build/ into a zip for store submission
```

## Where to Start

Open `src/background.ts` — it contains a fully commented scaffold with:

- Connection setup via `PuryFiBrowser`
- The handshake flow (ready → manifest → configuration → intents)
- Placeholders for your intents, configuration fields, and feature logic
- Error and close handlers

Fill in your intents, define your configuration, and add your logic after the `"Plugin initialized"` log line.

## Bridge Files

> **Important:** The `bridge.html` and `bridge.js` files (in both `src/` and `public/`) handle binary messaging between the extension and PuryFi on Chromium. These files **must match the version of the SDK** you are using. When you update `@pury-fi/plugin-sdk`, copy the latest bridge files from the SDK's `chromium/` folder into your project:
>
> ```
> node_modules/@pury-fi/plugin-sdk/chromium/bridge.html → public/bridge.html
> node_modules/@pury-fi/plugin-sdk/chromium/bridge.js   → src/bridge.js
> ```
>
> Mismatched bridge files can cause silent connection failures.

## Extension Manifest

The `public/manifest.json` is pre-configured with:

- Manifest V3
- A service worker background script
- `bridge.html` and `bridge.js` as web-accessible resources
- Storage permission

Update the `name`, `version`, and `description` fields for your plugin.
