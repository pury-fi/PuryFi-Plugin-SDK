# PuryFi State API Reference

> Read and write PuryFi's state.

## Table of Contents

- [Overview](#overview)
- [Intents](#intents)
- [Messages](#messages)
   - [`getState`](#getstate)
   - [`setState`](#setstate)
   - [`watchState`](#watchstate)
   - [`unwatchState`](#unwatchstate)
   - [`stateChange`](#statechange)
- [Types](#types)
   - [`State`](#state)
   - [`LockConfiguration`](#lockconfiguration)
   - [`LockConfigurationPassword`](#lockconfigurationpassword)
   - [`LockConfigurationTimer`](#lockconfigurationtimer)
   - [`LockConfigurationTimerPlus`](#lockconfigurationtimerplus)
   - [`WblistConfiguration`](#wblistconfiguration)
   - [`WblistEntry`](#wblistentry)
   - [`User`](#user)
   - [`UserSupportTier`](#usersupporttier)
- [Quick Reference](#quick-reference)


## Overview

The State API lets plugins read, write, and watch PuryFi's state using dot-separated paths like `lockConfiguration.timer.endTime` or `user.supportTier`. Each path has an access level controlling which operations are allowed.

Outgoing messages are sent with `PuryFiConnection.sendMessage`, and incoming messages are received with `PuryFiConnection.on`.

| Message        | Direction       | Description                                   |
| -------------- | --------------- | --------------------------------------------- |
| `getState`     | Plugin → PuryFi | Get the value at a path into state            |
| `setState`     | Plugin → PuryFi | Set the value at a path into state            |
| `watchState`   | Plugin → PuryFi | Subscribe to changes at a path into state     |
| `unwatchState` | Plugin → PuryFi | Unsubscribe from changes at a path into state |
| `stateChange`  | PuryFi → Plugin | Notify of a value change in state             |

## Intents

See the [Intents section in the README](../README.md#intents) for the full list of intents.

| Intent                     | Enables                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `readEnabled`              | `getState`, `watchState`, `unwatchState`, and `stateChange` on `enabled` path                |
| `writeEnabled`             | `setState` on `enabled` path                                                                 |
| `readLockConfiguration`    | `getState`, `watchState`, `unwatchState`, and `stateChange` on `lockConfiguration.*` paths   |
| `writeLockConfiguration`   | `setState` on `lockConfiguration.*` paths                                                    |
| `readWBlistConfiguration`  | `getState`, `watchState`, `unwatchState`, and `stateChange` on `wblistConfiguration.*` paths |
| `writeWBlistConfiguration` | `setState` on `wblistConfiguration.*` paths                                                  |
| `readUser`                 | `getState`, `watchState`, `unwatchState`, and `stateChange` on `user.*` paths                |

## Messages

## `getState`

Get the value at a path into state. See the type [State](#state) for all paths, and the types and access levels at each path.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state at which to get.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
   value: unknown; // The value at the passed path. The type depends on the passed path. No-read properties are omitted.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" |
      "invalidMessage" |
      "missingIntents" |
      "unavailablePath";
   message: string;
}
```

| Error Name        | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `unavailablePath` | A value somewhere along the path is null                    |
| `missingIntents`  | The required read intent for this path has not been granted |
| `invalidMessage`  | The message was malformed                                   |
| `internalError`   | Something went wrong inside PuryFi                          |

### Examples

Read whether PuryFi is enabled and log it:

```typescript
const res = await connection.sendMessage("getState", { path: "enabled" });
if (res.type === "ok") {
   if (res.value) {
      console.log("PuryFi is enabled");
   } else {
      console.log("PuryFi is disabled");
   }
}
```

Read the whitelist/blacklist configuration mode and log it:

```typescript
const res = await connection.sendMessage("getState", {
   path: "wblistConfiguration.mode",
});
if (res.type === "ok") {
   console.log(
      `The whitelist/blacklist configuration mode is set to ${res.value}`
   );
}
```

Read the mode of the whitelist/blacklist configuration and log it:

```typescript
const res = await connection.sendMessage("getState", {
   path: "lockConfiguration.password",
});
if (res.type === "ok") {
   if (res?.value != null) {
      // Note that LockConfigurationPassword.secret is no-read, so it is ommited from the returned value.
      console.log("A lock with a password is set");
   } else {
      console.log("No lock with a password is set");
   }
}
```

## `setState`

Set the value at a path into state. See the type [State](#state) for all paths, and the types and access levels at each path.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state at which to set.
   value: unknown; // The value to set at the passed path. The type depends on the passed path. No-write properties must be omitted.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" |
      "invalidMessage" |
      "missingIntents" |
      "unavailablePath";
   message: string;
}
```

| Error Name        | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `unavailablePath` | A value somewhere along the path is null                     |
| `missingIntents`  | The required write intent for this path has not been granted |
| `invalidMessage`  | The message was malformed                                    |
| `internalError`   | Something went wrong inside PuryFi                           |

### Examples

Enable PuryFi:

```typescript
await connection.sendMessage("setState", { path: "enabled", value: true });
```

Set a lock with a password:

```typescript
// Note that LockConfiguration.emergencyClientToken and LockConfiguration.startTime are no-write, so they are omitted from the passed value.
await connection.sendMessage("setState", {
   path: "lockConfiguration",
   value: {
      password: {
         secret: "00000",
      },
      timer: null,
      timerPlus: null,
   },
});
```

## `watchState`

Subscribe to value change events at a path into state. Refer to [`unwatchState`](#unwatchstate) for the message to unsubscribe, and [`stateChange`](#statechange) for the message received when the value at the path changes.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state at which to start watching.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage" | "missingIntents";
   message: string;
}
```

| Error Name       | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `missingIntents` | The required read intent for this path has not been granted |
| `invalidMessage` | The message was malformed                                   |
| `internalError`  | Something went wrong inside PuryFi                          |

### Examples

Refer to [`stateChange`](#statechange) for examples.

## `unwatchState`

Unsubscribe from value change events at a path into state. Refer to [`watchState`](#watchstate) for the message to subscribe, and [`stateChange`](#statechange) for the message received when the value at the path changes.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state at which to stop watching.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage" | "missingIntents";
   message: string;
}
```

| Error Name       | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `missingIntents` | The required read intent for this path has not been granted |
| `invalidMessage` | The message was malformed                                   |
| `internalError`  | Something went wrong inside PuryFi                          |

### Examples

Refer to [`stateChange`](#statechange) for examples.

## `stateChange`

Received when the value at a watched path into state changes. Refer to [`watchState`](#watchstate) for the message to subscribe, and [`unwatchState`](#unwatchstate) for the message to unsubscribe.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state at which a value changed.
   value: unknown; // The new value at the path. The type depends on the path. No-read properties are omitted.
}
```

### Examples

Subscribe to change events of the end time of the lock configuration timer, log the next 10 events, then unsubscribe:

```typescript
await connection.sendMessage("watchState", {
   path: "lockConfiguration.timer.endTime",
});

let count = 0;
connection.on("message", "stateChange", async function listener({ objects }) {
   if (objects.path === "lockConfiguration.timer.endTime") {
      console.log(
         `The end time of the lock configuration timer changed to ${objects.value}`
      );

      count++;
      if (count >= 10) {
         await connection.sendMessage("unwatchState", {
            path: "lockConfiguration.timer.endTime",
         });
         connection.off("message", "stateChange", listener);
      }
   }
});
```

## Types

## `State`

The root state object. Paths passed to `getState`, `setState`, `watchState`, and `unwatchState` are dot-separated paths into this type.

```typescript
{
   enabled: boolean; // Whether PuryFi is enabled.
   lockConfiguration: LockConfiguration | null; // The configured lock if any.
   wblistConfiguration: WblistConfiguration; // The configured whitelist/blacklist.
   user: User | null; // The logged-in user if any.
}
```

### Access Levels

| Key                   | `read` | `write` |
| --------------------- | :----: | :-----: |
| `enabled`             |   ✅   |   ✅    |
| `lockConfiguration`   |   ✅   |   ✅    |
| `wblistConfiguration` |   ✅   |   ✅    |
| `user`                |   ✅   |   ❌    |

## `LockConfiguration`

```typescript
{
   password: LockConfigurationPassword | null; // The configured password if any.
   timer: LockConfigurationTimer | null; // The configured timer if any.
   timerPlus: LockConfigurationTimerPlus | null; // The configured timer plus if any.
   emergencyClientToken: number; // The client token used for emergency unlocks.
   startTime: number; // The unix timestamp in miliseconds of when the lock was set.
}
```

### Access Levels

| Key                    | `read` | `write` |
| ---------------------- | :----: | :-----: |
| `password`             |   ✅   |   ✅    |
| `timer`                |   ✅   |   ✅    |
| `timerPlus`            |   ✅   |   ✅    |
| `emergencyClientToken` |   ✅   |   ❌    |
| `startTime`            |   ✅   |   ❌    |

## `LockConfigurationPassword`

```typescript
{
   secret: string; // The password secret.
}
```

### Access Levels

| Key      | `read` | `write` |
| -------- | :----: | :-----: |
| `secret` |   ❌   |   ✅    |

## `LockConfigurationTimer`

```typescript
{
   endTime: number; // The unix timestamp in miliseconds of when the timer will end.
}
```

### Access Levels

| Key       | `read` | `write` |
| --------- | :----: | :-----: |
| `endTime` |   ✅   |   ✅    |

## `LockConfigurationTimerPlus`

```typescript
{
   timesPerLabel: Record<number, number>; // The times added or substracted when objects of the given labels are detected as the user browses.
}
```

### Access Levels

| Key             | `read` | `write` |
| --------------- | :----: | :-----: |
| `timesPerLabel` |   ✅   |   ✅    |

## `WblistConfiguration`

```typescript
{
   mode: "whitelist" | "blacklist"; // Whether the whitelist or blacklist is active.
   whitelist: WblistEntry[];        // The whitelist entries.
   blacklist: WblistEntry[];        // The blacklist entries.
}
```

### Access Levels

| Key         | `read` | `write` |
| ----------- | :----: | :-----: |
| `mode`      |   ✅   |   ✅    |
| `whitelist` |   ✅   |   ✅    |
| `blacklist` |   ✅   |   ✅    |

## `WblistEntry`

```typescript
{
   mode: "text" | "regex"; // Whether the value is interpreted as plain text or as a regular expression.
   value: string; // The plain text or regular expression to match.
}
```

### Access Levels

| Key     | `read` | `write` |
| ------- | :----: | :-----: |
| `mode`  |   ✅   |   ✅    |
| `value` |   ✅   |   ✅    |

## `User`

```typescript
{
   username: string; // The user's username.
   supportTier: UserSupportTier; // The user's support tier.
}
```

### Access Levels

| Key           | `read` | `write` |
| ------------- | :----: | :-----: |
| `username`    |   ✅   |   ❌    |
| `supportTier` |   ✅   |   ❌    |

## `UserSupportTier`

```typescript
{
   level: number | null; // The tier level of support if any.
   name: string; // The display name of the supported tier or lack of supporter tier.
}
```

### Access Levels

| Key     | `read` | `write` |
| ------- | :----: | :-----: |
| `level` |   ✅   |   ❌    |
| `name`  |   ✅   |   ❌    |
