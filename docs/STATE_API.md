# PuryFi State API Reference

> Read, write, and watch PuryFi's internal state through `connection.sendMessage()`.

## Table of Contents

- [Overview](#overview)
- [Reading State](#reading-state)
- [Writing State](#writing-state)
- [Watching State](#watching-state)
- [State Tree](#state-tree)
   - [enabled](#1-enabled)
   - [lockConfiguration](#2-lockconfiguration)
   - [wblistConfiguration](#3-wblistconfiguration)
   - [user](#4-user)
- [Quick Reference](#quick-reference)

---

## Overview

The State API lets plugins read, write, and watch PuryFi's internal state using **dot-separated paths** like `lockConfiguration.timer.endTime`. Each path has an access level controlling which operations are allowed.

State operations are regular messages sent via `connection.sendMessage()`:

| Message        | Direction       | Description                               |
| -------------- | --------------- | ----------------------------------------- |
| `getState`     | Plugin → PuryFi | Read a value at a path                    |
| `setState`     | Plugin → PuryFi | Write a value at a path                   |
| `watchState`   | Plugin → PuryFi | Subscribe to changes at a path            |
| `unwatchState` | Plugin → PuryFi | Unsubscribe from changes at a path        |
| `stateChange`  | PuryFi → Plugin | Notification that a watched value changed |

### Required Intents

State paths are gated by intents. You must request the appropriate intents before accessing a path. See the [Intents section in the README](../README.md#intents) for the full list of available intents.

| Intent                     | Paths                                |
| -------------------------- | ------------------------------------ |
| `readEnabled`              | `enabled` (get, watch)               |
| `writeEnabled`             | `enabled` (set)                      |
| `readLockConfiguration`    | `lockConfiguration.*` (get, watch)   |
| `writeLockConfiguration`   | `lockConfiguration.*` (set)          |
| `readWBlistConfiguration`  | `wblistConfiguration.*` (get, watch) |
| `writeWBlistConfiguration` | `wblistConfiguration.*` (set)        |
| `readUser`                 | `user.*` (get, watch)                |

### Access Levels

Each path has an access level that determines which operations are allowed:

| Access         | `getState` | `setState` | Description                 |
| -------------- | :--------: | :--------: | --------------------------- |
| **read-write** |     ✅     |     ✅     | Full access                 |
| **read-only**  |     ✅     |     ❌     | Can be read but not written |
| **write-only** |     ❌     |     ✅     | Can be written but not read |

---

## Reading State

Use `getState` to read a value at a path. The response includes a typed `value` on success.

```typescript
const res = await connection.sendMessage("getState", { path: "enabled" });
if (res.type === "ok") {
   console.log("Enabled:", res.value); // boolean
}
```

When reading an object path, write-only fields are omitted from the response:

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration",
});
if (res.type === "ok" && res.value !== null) {
   // res.value.password?.secret is omitted (write-only)
   console.log("Lock start:", res.value.startTime);
}
```

### Error Responses

```typescript
if (res.type === "error") {
   // res.name: "internalError" | "invalidMessage" | "missingIntents" | "unavailablePath"
   console.error(res.name, res.message);
}
```

---

## Writing State

Use `setState` to write a value at a path.

```typescript
const res = await connection.sendMessage("setState", {
   path: "wblistConfiguration.mode",
   value: "whitelist",
});
if (res.type === "error") {
   console.error(res.name, res.message);
}
```

---

## Watching State

Subscribe to real-time change notifications for a path using `watchState`. When the value changes, PuryFi sends a `stateChange` message.

```typescript
// Subscribe
await connection.sendMessage("watchState", { path: "enabled" });

// Handle changes
connection.on("message", "stateChange", (payload) => {
   console.log(`${payload.path} changed to`, payload.value);
});

// Unsubscribe
await connection.sendMessage("unwatchState", { path: "enabled" });
```

The `stateChange` payload contains:

- `path` — the state path that changed
- `value` — the new value (with write-only fields omitted for object paths)

---

## State Tree

### 1. `enabled`

Whether PuryFi's content filtering is currently active.

|             |                                |
| ----------- | ------------------------------ |
| **Path**    | `enabled`                      |
| **Type**    | `boolean`                      |
| **Access**  | read-write                     |
| **Intents** | `readEnabled` / `writeEnabled` |

```typescript
// Read
const res = await connection.sendMessage("getState", { path: "enabled" });
// res.value: boolean

// Write
await connection.sendMessage("setState", { path: "enabled", value: true });
```

---

### 2. `lockConfiguration`

The active lock configuration. `null` when no lock is active. Contains lock type details and metadata.

|             |                                                    |
| ----------- | -------------------------------------------------- |
| **Path**    | `lockConfiguration`                                |
| **Type**    | `object \| null`                                   |
| **Access**  | read-write                                         |
| **Intents** | `readLockConfiguration` / `writeLockConfiguration` |

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration",
});
if (res.type === "ok" && res.value !== null) {
   console.log("Lock started at:", res.value.startTime);
}
```

**Read-view shape** (write-only fields omitted):

```typescript
{
   password: null | {
      // secret is write-only — omitted from reads
   },
   timer: null | {
      endTime: number
   },
   timerPlus: null | {
      timesPerLabel: Record<number, number>
   },
   emergencyClientToken: number,
   startTime: number
}
```

#### All Paths

| Path                                        | Type                     | `get` | `set` |
| ------------------------------------------- | ------------------------ | :---: | :---: |
| `lockConfiguration`                         | `object \| null`         |  ✅   |  ✅   |
| `lockConfiguration.password`                | `object \| null`         |  ✅   |  ✅   |
| `lockConfiguration.password.secret`         | `string`                 |  ❌   |  ✅   |
| `lockConfiguration.timer`                   | `object \| null`         |  ✅   |  ✅   |
| `lockConfiguration.timer.endTime`           | `number`                 |  ✅   |  ✅   |
| `lockConfiguration.timerPlus`               | `object \| null`         |  ✅   |  ✅   |
| `lockConfiguration.timerPlus.timesPerLabel` | `Record<number, number>` |  ✅   |  ✅   |
| `lockConfiguration.emergencyClientToken`    | `number`                 |  ✅   |  ❌   |
| `lockConfiguration.startTime`               | `number`                 |  ✅   |  ❌   |

---

#### `lockConfiguration.password`

The password lock configuration. `null` when the lock is not password-based.

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.password",
});
// res.value: null | { } (secret is write-only and omitted)
```

#### `lockConfiguration.password.secret`

The password secret. **Write-only** — can be set but never read.

```typescript
await connection.sendMessage("setState", {
   path: "lockConfiguration.password.secret",
   value: "new-secret",
});
```

#### `lockConfiguration.timer`

The timer lock configuration. `null` when the lock is not timer-based.

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.timer",
});
// res.value: null | { endTime: number }
```

#### `lockConfiguration.timer.endTime`

Unix timestamp (ms) when the timer lock expires.

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.timer.endTime",
});
// res.value: number

await connection.sendMessage("setState", {
   path: "lockConfiguration.timer.endTime",
   value: Date.now() + 3600000,
});
```

#### `lockConfiguration.timerPlus`

The timer-plus lock configuration. `null` when the lock does not use timer-plus mode.

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.timerPlus",
});
// res.value: null | { timesPerLabel: Record<number, number> }
```

#### `lockConfiguration.timerPlus.timesPerLabel`

A map of label IDs to remaining time values for the timer-plus lock.

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.timerPlus.timesPerLabel",
});
// res.value: Record<number, number>
```

#### `lockConfiguration.emergencyClientToken`

A numeric token used for emergency unlock flows. **Read-only.**

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.emergencyClientToken",
});
// res.value: number
```

#### `lockConfiguration.startTime`

Unix timestamp (ms) of when the lock was activated. **Read-only.**

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.startTime",
});
// res.value: number
```

---

### 3. `wblistConfiguration`

The whitelist/blacklist configuration.

|             |                                                        |
| ----------- | ------------------------------------------------------ |
| **Path**    | `wblistConfiguration`                                  |
| **Type**    | `object`                                               |
| **Access**  | read-write                                             |
| **Intents** | `readWBlistConfiguration` / `writeWBlistConfiguration` |

```typescript
const res = await connection.sendMessage("getState", {
   path: "wblistConfiguration",
});
// res.value: { mode, whitelist, blacklist }
```

#### All Paths

| Path                            | Type                         | `get` | `set` |
| ------------------------------- | ---------------------------- | :---: | :---: |
| `wblistConfiguration`           | `object`                     |  ✅   |  ✅   |
| `wblistConfiguration.mode`      | `"whitelist" \| "blacklist"` |  ✅   |  ✅   |
| `wblistConfiguration.whitelist` | `Array<{ mode, value }>`     |  ✅   |  ✅   |
| `wblistConfiguration.blacklist` | `Array<{ mode, value }>`     |  ✅   |  ✅   |

---

#### `wblistConfiguration.mode`

Whether the list operates as a whitelist or a blacklist.

```typescript
const res = await connection.sendMessage("getState", {
   path: "wblistConfiguration.mode",
});
// res.value: "whitelist" | "blacklist"

await connection.sendMessage("setState", {
   path: "wblistConfiguration.mode",
   value: "whitelist",
});
```

#### `wblistConfiguration.whitelist`

Array of whitelist entries. Each entry has a matching mode and a value.

```typescript
await connection.sendMessage("setState", {
   path: "wblistConfiguration.whitelist",
   value: [
      { mode: "text", value: "example.com" },
      { mode: "regex", value: ".*\\.safe\\.org" },
   ],
});
```

#### `wblistConfiguration.blacklist`

Array of blacklist entries. Same shape as whitelist entries.

```typescript
await connection.sendMessage("setState", {
   path: "wblistConfiguration.blacklist",
   value: [{ mode: "text", value: "bad-site.com" }],
});
```

---

### 4. `user`

The currently logged-in user. `null` when no user is signed in. **Entirely read-only.**

|             |                  |
| ----------- | ---------------- |
| **Path**    | `user`           |
| **Type**    | `object \| null` |
| **Access**  | read-only        |
| **Intents** | `readUser`       |

```typescript
const res = await connection.sendMessage("getState", { path: "user" });
if (res.type === "ok" && res.value !== null) {
   console.log("Username:", res.value.username);
   console.log("Support tier:", res.value.supportTier.name);
}
```

**Shape:**

```typescript
{
   username: string,
   supportTier: {
      level: number | null,
      name: string
   }
}
```

#### All Paths

| Path                     | Type             | `get` | `set` |
| ------------------------ | ---------------- | :---: | :---: |
| `user`                   | `object \| null` |  ✅   |  ❌   |
| `user.username`          | `string`         |  ✅   |  ❌   |
| `user.supportTier`       | `object`         |  ✅   |  ❌   |
| `user.supportTier.level` | `number \| null` |  ✅   |  ❌   |
| `user.supportTier.name`  | `string`         |  ✅   |  ❌   |

---

## Quick Reference

### All Paths — Access Matrix

| Path                                        | Type                         | `get` | `set` |
| ------------------------------------------- | ---------------------------- | :---: | :---: |
| `enabled`                                   | `boolean`                    |  ✅   |  ✅   |
| `lockConfiguration`                         | `object \| null`             |  ✅   |  ✅   |
| `lockConfiguration.password`                | `object \| null`             |  ✅   |  ✅   |
| `lockConfiguration.password.secret`         | `string`                     |  ❌   |  ✅   |
| `lockConfiguration.timer`                   | `object \| null`             |  ✅   |  ✅   |
| `lockConfiguration.timer.endTime`           | `number`                     |  ✅   |  ✅   |
| `lockConfiguration.timerPlus`               | `object \| null`             |  ✅   |  ✅   |
| `lockConfiguration.timerPlus.timesPerLabel` | `Record<number, number>`     |  ✅   |  ✅   |
| `lockConfiguration.emergencyClientToken`    | `number`                     |  ✅   |  ❌   |
| `lockConfiguration.startTime`               | `number`                     |  ✅   |  ❌   |
| `wblistConfiguration`                       | `object`                     |  ✅   |  ✅   |
| `wblistConfiguration.mode`                  | `"whitelist" \| "blacklist"` |  ✅   |  ✅   |
| `wblistConfiguration.whitelist`             | `Array<{ mode, value }>`     |  ✅   |  ✅   |
| `wblistConfiguration.blacklist`             | `Array<{ mode, value }>`     |  ✅   |  ✅   |
| `user`                                      | `object \| null`             |  ✅   |  ❌   |
| `user.username`                             | `string`                     |  ✅   |  ❌   |
| `user.supportTier`                          | `object`                     |  ✅   |  ❌   |
| `user.supportTier.level`                    | `number \| null`             |  ✅   |  ❌   |
| `user.supportTier.name`                     | `string`                     |  ✅   |  ❌   |

### Notes

- **Nullable paths**: `lockConfiguration` and `user` are `null` when no lock is active or no user is signed in, respectively. Sub-paths under `lockConfiguration` like `password`, `timer`, and `timerPlus` are `null` when that lock type is not in use.
- **Nested reads**: When you `getState` on an object path, write-only fields within it are omitted from the response.
- **Type safety**: All paths, operations, values, and access levels are fully type-checked at compile time. TypeScript prevents reading write-only paths and writing to read-only paths.
