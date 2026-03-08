# WebSocket Plugin — State API

A working example of a standalone WebSocket plugin that uses the PuryFi Plugin SDK to read, write, and watch PuryFi's state.

## What It Does

This plugin connects to PuryFi and demonstrates the **State API**:

- **Reads state** — fetches the current enabled status, user profile (with support tier), and lock configuration on startup.
- **Watches state** — monitors `enabled`, `lockConfiguration`, and `wblistConfiguration.mode` for live changes.
- **Writes state** — adds a configurable site to the blacklist if not already present.
- **Auto-enable on lock** — when a lock is activated and the `autoEnableOnLock` config is on, the plugin automatically enables PuryFi by writing to the `enabled` state.
- **Reacts to configuration changes** — detects which fields changed and logs them.

## Intents Used

| Intent | Purpose |
|--------|---------|
| `readEnabled` | Read and watch the enabled/disabled state |
| `writeEnabled` | Enable/disable PuryFi programmatically |
| `readLockConfiguration` | Read and watch lock status |
| `readWBlistConfiguration` | Read blacklist and watch list mode |
| `writeWBlistConfiguration` | Add entries to the blacklist |
| `readUser` | Read the current user profile |

## Configuration Fields

The plugin exposes two user-editable settings in the PuryFi UI:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `autoEnableOnLock` | boolean | `true` | Automatically enable PuryFi when a lock is activated |
| `blockedSite` | string | `"example.com"` | Domain to add to the blacklist on startup |

## Running the Example

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build and run:**

   ```bash
   npm run build
   node dist/index.js
   ```
   or
   ```bash
   npm start
   ```

   The plugin binds to port **8080** and waits for PuryFi to connect.

3. In PuryFi, add a WebSocket plugin pointing to `ws://localhost:8080`.

## Key Code

The main logic lives in `src/index.ts`:

- Sets up the connection and handshake
- Reads initial state (`enabled`, `user`, `lockConfiguration`)
- Watches three state paths and handles changes in a `switch` block
- Writes to `wblistConfiguration.blacklist` to add a site
- Writes to `enabled` when a lock activates (if configured)

See the SDK's [State API documentation](../../docs/STATE_API.md) for the full list of state paths, access levels, and type information.
