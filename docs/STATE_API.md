# PuryFi State API Reference

> RPC-style API for querying and mutating PuryFi state via `sendQueries()`.

## Table of Contents

- [Overview](#overview)
- [enabled](#1-enabled)
- [lockConfiguration](#2-lockconfiguration)
  - [.password](#password)
  - [.password.secret](#passwordsecret)
  - [.timer](#timer)
  - [.timer.endTime](#timerendtime)
  - [.timerPlus](#timerplus)
  - [.timerPlus.timesPerLabel](#timersplustimesperlabel)
  - [.emergencyClientToken](#emergencyclienttoken)
  - [.startTime](#starttime)
- [wblistConfiguration](#3-wblistconfiguration)
  - [.mode](#mode)
  - [.whitelist](#whitelist)
  - [.blacklist](#blacklist)
- [Quick Reference](#quick-reference)

---

## Overview

The State API lets plugins read and write PuryFi's internal state through **queries** — small RPC-like operations sent in batches via `puryfiSDK.sendQueries()`. Each query targets a **path** (dot-separated key like `lockConfiguration.timer.endTime`) and performs either a **get** or **set** operation.

```typescript
const [enabled, wbMode] = await puryfiSDK.sendQueries(
  { op: "get", path: "enabled" },
  { op: "get", path: "wblistConfiguration.mode" }
);
```

### Access Levels

Each path has an access level that determines which operations are allowed:

| Access | `get` | `set` | Description |
|--------|:-----:|:-----:|-------------|
| **read-write** | ✅ | ✅ | Full access — read and write freely |
| **read-only** | ✅ | ❌ | Can be read but not modified by plugins |
| **protected** | ❌ | ✅ | Can be written but the value is never returned to the plugin |
| **no access** | ❌ | ❌ | Completely inaccessible |

> Access is **inherited**. If a parent path is read-only, all of its children are also not directly settable at the parent level, but individual children may still be writable at their own path.

---

## 1. `enabled`

Whether PuryFi's content filtering is currently active.

| | |
|---|---|
| **Path** | `enabled` |
| **Type** | `boolean` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
// Read
const [enabled] = await puryfiSDK.sendQueries(
  { op: "get", path: "enabled" }
);

// Write
await puryfiSDK.sendQueries(
  { op: "set", path: "enabled", value: true }
);
```

---

## 2. `lockConfiguration`

The active lock configuration. Contains lock type details and metadata.  
This entire subtree is `undefined` when no lock is active.

| | |
|---|---|
| **Path** | `lockConfiguration` |
| **Type** | `object \| undefined` |
| **Access** | read-only |
| **Operations** | `get` |

> `lockConfiguration` itself can only be read, not written directly. Individual children have their own access levels — see below.

```typescript
const [lock] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration" }
);
```

**Response shape** (read view — protected fields omitted):
```typescript
{
  password?: {
    // secret is protected — omitted from reads
  },
  timer?: {
    endTime: number
  },
  timerPlus?: {
    timesPerLabel: Record<number, number>
  },
  emergencyClientToken: string,
  startTime: number
}
```

**Paths in this section:**

| Path | Type | `get` | `set` |
|------|------|:-----:|:-----:|
| `lockConfiguration` | `object?` | ✅ | ❌ |
| `lockConfiguration.password` | `object?` | ✅ | ✅ |
| `lockConfiguration.password.secret` | `string` | ❌ | ✅ |
| `lockConfiguration.timer` | `object?` | ✅ | ✅ |
| `lockConfiguration.timer.endTime` | `number` | ✅ | ✅ |
| `lockConfiguration.timerPlus` | `object?` | ✅ | ✅ |
| `lockConfiguration.timerPlus.timesPerLabel` | `Record<number, number>` | ✅ | ✅ |
| `lockConfiguration.emergencyClientToken` | `string` | ✅ | ❌ |
| `lockConfiguration.startTime` | `number` | ✅ | ❌ |

---

### `password`

The password lock configuration. Present when the lock is password-based.

| | |
|---|---|
| **Path** | `lockConfiguration.password` |
| **Type** | `object \| undefined` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [password] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.password" }
);
// Returns: { } (secret is protected and omitted)
```

---

### `password.secret`

The actual password secret. **Protected** — plugins can set it but never read it.

| | |
|---|---|
| **Path** | `lockConfiguration.password.secret` |
| **Type** | `string` |
| **Access** | protected |
| **Operations** | `set` |

```typescript
await puryfiSDK.sendQueries(
  { op: "set", path: "lockConfiguration.password.secret", value: "new-secret" }
);
```

---

### `timer`

The timer lock configuration. Present when the lock is timer-based.

| | |
|---|---|
| **Path** | `lockConfiguration.timer` |
| **Type** | `object \| undefined` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [timer] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.timer" }
);
// Returns: { endTime: number }
```

---

### `timer.endTime`

Unix timestamp (ms) when the timer lock expires.

| | |
|---|---|
| **Path** | `lockConfiguration.timer.endTime` |
| **Type** | `number` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [endTime] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.timer.endTime" }
);

await puryfiSDK.sendQueries(
  { op: "set", path: "lockConfiguration.timer.endTime", value: Date.now() + 3600000 }
);
```

---

### `timerPlus`

The timer-plus lock configuration. Present when the lock uses the timer-plus mode.

| | |
|---|---|
| **Path** | `lockConfiguration.timerPlus` |
| **Type** | `object \| undefined` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [timerPlus] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.timerPlus" }
);
// Returns: { timesPerLabel: Record<number, number> }
```

---

### `timerPlus.timesPerLabel`

A map of label IDs to remaining time values for the timer-plus lock.

| | |
|---|---|
| **Path** | `lockConfiguration.timerPlus.timesPerLabel` |
| **Type** | `Record<number, number>` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [timesPerLabel] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.timerPlus.timesPerLabel" }
);
```

---

### `emergencyClientToken`

A token used for emergency unlock flows.

| | |
|---|---|
| **Path** | `lockConfiguration.emergencyClientToken` |
| **Type** | `string` |
| **Access** | read-only |
| **Operations** | `get` |

```typescript
const [token] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.emergencyClientToken" }
);
```

---

### `startTime`

Unix timestamp (ms) of when the lock was activated.

| | |
|---|---|
| **Path** | `lockConfiguration.startTime` |
| **Type** | `number` |
| **Access** | read-only |
| **Operations** | `get` |

```typescript
const [startTime] = await puryfiSDK.sendQueries(
  { op: "get", path: "lockConfiguration.startTime" }
);
```

---

## 3. `wblistConfiguration`

The whitelist/blacklist configuration object.

| | |
|---|---|
| **Path** | `wblistConfiguration` |
| **Type** | `object` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [wblist] = await puryfiSDK.sendQueries(
  { op: "get", path: "wblistConfiguration" }
);
// Returns: { mode, whitelist, blacklist }
```

**Paths in this section:**

| Path | Type | `get` | `set` |
|------|------|:-----:|:-----:|
| `wblistConfiguration` | `object` | ✅ | ✅ |
| `wblistConfiguration.mode` | `"whitelist" \| "blacklist"` | ✅ | ✅ |
| `wblistConfiguration.whitelist` | `Array<{ mode, value }>` | ✅ | ✅ |
| `wblistConfiguration.blacklist` | `Array<{ mode, value }>` | ✅ | ✅ |

---

### `mode`

Whether the list operates as a whitelist or a blacklist.

| | |
|---|---|
| **Path** | `wblistConfiguration.mode` |
| **Type** | `"whitelist" \| "blacklist"` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [mode] = await puryfiSDK.sendQueries(
  { op: "get", path: "wblistConfiguration.mode" }
);

await puryfiSDK.sendQueries(
  { op: "set", path: "wblistConfiguration.mode", value: "whitelist" }
);
```

---

### `whitelist`

Array of whitelist entries. Each entry has a matching mode and a value.

| | |
|---|---|
| **Path** | `wblistConfiguration.whitelist` |
| **Type** | `Array<{ mode: "text" \| "regex"; value: string }>` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [whitelist] = await puryfiSDK.sendQueries(
  { op: "get", path: "wblistConfiguration.whitelist" }
);

await puryfiSDK.sendQueries(
  { op: "set", path: "wblistConfiguration.whitelist", value: [
    { mode: "text", value: "example.com" },
    { mode: "regex", value: ".*\\.safe\\.org" }
  ]}
);
```

---

### `blacklist`

Array of blacklist entries. Each entry has a matching mode and a value.

| | |
|---|---|
| **Path** | `wblistConfiguration.blacklist` |
| **Type** | `Array<{ mode: "text" \| "regex"; value: string }>` |
| **Access** | read-write |
| **Operations** | `get` `set` |

```typescript
const [blacklist] = await puryfiSDK.sendQueries(
  { op: "get", path: "wblistConfiguration.blacklist" }
);

await puryfiSDK.sendQueries(
  { op: "set", path: "wblistConfiguration.blacklist", value: [
    { mode: "text", value: "bad-site.com" }
  ]}
);
```

---

## Quick Reference

### All Paths — Access Matrix

| Path | Type | `get` | `set` |
|------|------|:-----:|:-----:|
| `enabled` | `boolean` | ✅ | ✅ |
| `lockConfiguration` | `object?` | ✅ | ❌ |
| `lockConfiguration.password` | `object?` | ✅ | ✅ |
| `lockConfiguration.password.secret` | `string` | ❌ | ✅ |
| `lockConfiguration.timer` | `object?` | ✅ | ✅ |
| `lockConfiguration.timer.endTime` | `number` | ✅ | ✅ |
| `lockConfiguration.timerPlus` | `object?` | ✅ | ✅ |
| `lockConfiguration.timerPlus.timesPerLabel` | `Record<number, number>` | ✅ | ✅ |
| `lockConfiguration.emergencyClientToken` | `string` | ✅ | ❌ |
| `lockConfiguration.startTime` | `number` | ✅ | ❌ |
| `wblistConfiguration` | `object` | ✅ | ✅ |
| `wblistConfiguration.mode` | `"whitelist" \| "blacklist"` | ✅ | ✅ |
| `wblistConfiguration.whitelist` | `Array<{ mode, value }>` | ✅ | ✅ |
| `wblistConfiguration.blacklist` | `Array<{ mode, value }>` | ✅ | ✅ |

### Batching Queries

`sendQueries()` accepts any number of query objects and returns a typed tuple of results in the same order:

```typescript
const [a, b, c] = await puryfiSDK.sendQueries(
  { op: "get", path: "enabled" },
  { op: "get", path: "lockConfiguration.startTime" },
  { op: "set", path: "wblistConfiguration.mode", value: "blacklist" }
);
// a: boolean
// b: number
// c: undefined (set queries return undefined)
```

### Notes

- **Timeout**: Queries time out after **5 seconds** if PuryFi does not respond.
- **Return values**: `get` queries return the value at the path. `set` queries return `undefined`.
- **Nested reads**: When you `get` an object path, protected fields within it are omitted from the response.
- **Optional paths**: Paths under `lockConfiguration` may return `undefined` if no lock is currently active, or if the specific lock type is not the one in use.
- **Type safety**: All paths, operations, and values are fully type-checked at compile time. The TypeScript compiler will prevent you from reading protected paths or writing to read-only paths.
