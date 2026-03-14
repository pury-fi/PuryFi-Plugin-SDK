# Examples

> Example plugins built with the PuryFi Plugin SDK. For documentation, refer to the [Documentation](/docs/README.md). For a quick start guide, refer to [Quick Start](/README.md#quick-start).

## Examples

All examples are available as both a WebSocket plugin and a browser extension plugin, except for the Media Censor CLI one which is WebSocket only.

- **[minimal-plugin](minimal-plugin/)** — A minimal example that goes through each step needed to connect to PuryFi without implementing any particular functionality. A good starting point.
- **[enable-scheduler-plugin](enable-scheduler-plugin/)** — Enables and disables PuryFi on a daily schedule. Has two configuration fields for the enable and disable times in 24-hour format (`HH:MM`).
- **[media-censor-cli-plugin](media-censor-cli-plugin/)** — Takes an input folder and an output folder as arguments, censors every image in the input folder, and writes the results to the output folder.
- **[media-scan-events-logger-plugin](media-scan-events-logger-plugin/)** — Listens for media scan events as the user browses and logs them to the console. Has a configuration field to toggle whether events with no detected objects are logged.

Note that these examples, although complete, are not intended to be released as-is. Just to mention a few issues present: they don't attempt reconnection after a connection is closed once, they don't do error handling, and they don't have a persistent configuration.

## Building and Running

### WebSocket Plugins

Install dependencies and build:

```bash
npm install
npm run build
```

Then run:

```bash
npm start
```

### Browser Extension Plugins

Install dependencies and build:

```bash
npm install
npm run build
```

The build produces two separate extension bundles under `build/`:

- `build/chromium/` — Run as an unpacked extension in Chromium browsers via `chrome://extensions`.
- `build/firefox/` — Run in Firefox using the commands below.

**Run in Firefox:**

```bash
npm run dev:firefox
```

**Run in Firefox with automatic reloading on source changes:**

```bash
npm run dev:firefox:watch
```
