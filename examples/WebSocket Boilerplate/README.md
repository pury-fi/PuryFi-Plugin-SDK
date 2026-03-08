# WebSocket Boilerplate

A ready-to-use template for building a standalone WebSocket plugin with the PuryFi Plugin SDK. Copy this folder to start developing your own plugin.

## Getting Started

1. **Copy this folder** to your own project directory.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build and run:**

   ```bash
   npm run build
   node dist/index.js
   ```

   The plugin binds to port **8080** and waits for PuryFi to connect.

4. In PuryFi, add a WebSocket plugin pointing to `ws://localhost:8080`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Compile with file watching |
| `npm start` | Run the Plugin |

## Project Structure

```
src/
  index.ts   — Plugin entry point (your logic goes here)
```

## Where to Start

Open `src/index.ts` — it contains a fully commented scaffold with:

- Connection setup via `PuryFiSocket` on port 8080
- The handshake flow (ready → manifest → configuration → intents)
- Placeholders for your intents, configuration fields, and feature logic
- Error and close handlers

Fill in your intents, define your configuration, and add your logic after the `"Plugin initialized"` log line.

## How It Works

WebSocket plugins invert the typical client/server relationship — your plugin binds to a local port and PuryFi connects to it. The SDK handles the connection lifecycle, message encoding (msgpack), and typed event routing. You just respond to events and send messages.
