# Plugin SDK Documentation

> Documentation for PuryFi's Plugin SDK. For a quick start guide, refer to [Quick Start](/README.md#quick-start). For entire example plugins, refer to [Examples](/examples/README.md).

## Table of Contents

- [Overview](#overview)
- [Messages](#messages)
   - [Incoming `ready`](#incoming-ready)
   - [Outgoing `setPluginManifest`](#outgoing-setpluginmanifest)
   - [Outgoing `getPluginManifest`](#outgoing-getpluginmanifest)
   - [Outgoing `setPluginConfiguration`](#outgoing-setpluginconfiguration)
   - [Outgoing `getPluginConfiguration`](#outgoing-getpluginconfiguration)
   - [Incoming `configurationChange`](#incoming-configurationchange)
   - [Outgoing `requestPluginIntents`](#outgoing-requestpluginintents)
   - [Outgoing `getPendingPluginIntents`](#outgoing-getpendingpluginintents)
   - [Outgoing `getPluginIntents`](#outgoing-getpluginintents)
   - [Outgoing `getState`](#outgoing-getstate)
   - [Outgoing `setState`](#outgoing-setstate)
   - [Outgoing `subscribeToState`](#outgoing-subscribetostate)
   - [Outgoing `unsubscribeFromState`](#outgoing-unsubscribefromstate)
   - [Incoming `stateChange`](#incoming-statechange)
   - [Outgoing `enterLockPassword`](#outgoing-enterlockpassword)
   - [Outgoing `enterLockEmergencyServerToken`](#outgoing-enterlockemergencyservertoken)
   - [Outgoing `scanStaticMedia`](#outgoing-scanstaticmedia)
   - [Outgoing `censorStaticMedia`](#outgoing-censorstaticmedia)
   - [Outgoing `subscribeToStaticMediaScans`](#outgoing-subscribetostaticmediascans)
   - [Outgoing `unsubscribeFromStaticMediaScans`](#outgoing-unsubscribefromstaticmediascans)
   - [Incoming `staticMediaScan`](#incoming-staticmediascan)
- [Types](#types)
   - [`PluginManifest`](#pluginmanifest)
   - [`PluginConfiguration`](#pluginconfiguration)
   - [`PluginConfigurationField`](#pluginconfigurationfield)
   - [`PluginIntent`](#pluginintent)
   - [`State`](#state)
   - [`LockConfiguration`](#lockconfiguration)
   - [`LockConfigurationPassword`](#lockconfigurationpassword)
   - [`LockConfigurationTimer`](#lockconfigurationtimer)
   - [`LockConfigurationTimerPlus`](#lockconfigurationtimerplus)
   - [`WblistConfiguration`](#wblistconfiguration)
   - [`WblistEntry`](#wblistentry)
   - [`User`](#user)
   - [`UserSupportTier`](#usersupporttier)
   - [`Object`](#object)
   - [`Rect`](#rect)
   - [`Label`](#label)

## Overview

The State API lets plugins read, write, and subscribe to PuryFi's state using dot-separated paths like `lockConfiguration.timer.endTime` or `user.supportTier`. Each path has an access level controlling which operations are allowed.

Outgoing messages are sent with `Connection.sendMessage`, and incoming messages are received with `Connection.on`.

## Messages

Messages are what is sent between plugins and PuryFi for communication and consist of a type and a payload associated with that type. Some but not all messages expect responses.

Messages are sent with `Connection.sendMessage` and responses are returned in a promise.

Messages are received with `Connection.on` or `Connection.once` and responses are sent by returning on the passed handler. If multiple handlers have been set for the same message, the return of the previous handler is passed to the handler and only the return of the last handler is sent as a response. If the two-argument form of the methods is used, the handler will receive any messages; if the three-argument form of the functions is used where a message type is also, the handler will only receive messages of that type.

What messages allow what functionality can be broken down as follows:

- Incoming `ready`: Receive PuryFi's version and API version. This message must be responded to with a success response before any other messages are sent or received.
- Outgoing `setPluginManifest`, `getPluginManifest`, `setPluginConfiguration`, and `getPluginConfiguration`, and incoming `configurationChange`: Get and set the manifest and user-adjustable configuration of the plugin.
- Outgoing `requestPluginIntents`, `getPendingPluginIntents`, and `getPluginIntents`, and incoming `intentsGrant`: Request and wait for plugin intents to be granted. Intents are required for sending and receiving most messages. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.
- Outgoing `setState`, `getState`, `subscribeToState`, and `unsubscribeFromState`, and incoming `stateChange`: Get, set, and subscribe to changes to PuryFi's state through dot-separated paths like `lockConfiguration.timer.endTime` or `user.supportTier`. Not all of PuryFi's state is currently exposed to plugins; the exposed state currently includes whether the extension is enabled, the lock configuration, the whitelist/blacklist configuration, and the logged-in user. Note that some state is also only accessible for reading, and some only for writing. Refer to [State](#state) for all paths, and the types and access levels at each path.
- Outgoing `scanStaticMedia`, `censorStaticMedia`, `subscribeToStaticMediaScans`, and `unsubscribeFromStaticMediaScans`, and incoming `staticMediaScan`: Scan and censor images, and subscribe to scan events happening as the user browses.
- Outgoing `enterLockPassword` and `enterLockEmergencyServerToken`: Perform various actions also available to users through PuryFi's UI. Currently this includes entering a password and entering an emergency server token for a set lock.

For further details and examples, navigate to the respective sections of each message type.

## Incoming `ready`

Received shortly after a connection opens. Contains PuryFi's version and API version. This message must be responded to with a success response before any other messages are sent or received. It is recommeded to delegate responding to this message to the connection itself.

### Arguments

```typescript
{
   version: string; // PuryFi's version.
   apiVersion: string; // The plugin API version that PuryFi offers. This is not the same as PuryFi's version.
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
   name: "incompatibleApiVersion" | string;
   message: string;
}
```

| Error Name               | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `incompatibleApiVersion` | The plugin is not compatible with the plugin API version offered by PuryFi       |
| string                   | Any other error that may occur inside the plugin while responding to the message |

## Outgoing `setPluginManifest`

Set the plugin manifest.

### Arguments

```typescript
{
   manifest: PluginManifest; // The plugin manifest to set.
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
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Outgoing `getPluginManifest`

Get the plugin manifest.

### Return

**Success:**

```typescript
{
   type: "ok";
   manifest: PluginManifest; // The plugin manifest.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Outgoing `setPluginConfiguration`

Set the user-adjustable plugin configuration.

### Arguments

```typescript
{
   configuration: PluginConfiguration; // The plugin configuration to set.
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
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Outgoing `getPluginConfiguration`

Get the user-adjustable plugin configuration.

### Return

**Success:**

```typescript
{
   type: "ok";
   configuration: PluginConfiguration; // The plugin configuration.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Incoming `configurationChange`

Received when the plugin configuration changes.

### Arguments

```typescript
{
   configuration: PluginConfiguration; // The plugin configuration.
}
```

## Outgoing `requestPluginIntents`

Request plugin intents to be granted. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.

### Arguments

```typescript
{
   intents: string[]; // The plugin intents to request.
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
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Outgoing `getPendingPluginIntents`

Get the plugin intents that have been requested and not yet granted.

### Return

**Success:**

```typescript
{
   type: "ok";
   pendingIntents: string[]; // The pending plugin intents.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

### Outgoing `getPluginIntents`

Get the granted plugin intents.

### Return

**Success:**

```typescript
{
   type: "ok";
   intents: string[]; // The granted plugin intents.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage";
   message: string;
}
```

| Error Name       | Description                        |
| ---------------- | ---------------------------------- |
| `invalidMessage` | The message was malformed          |
| `internalError`  | Something went wrong inside PuryFi |

## Outgoing `getState`

Requires different plugin intents depending on the passed path. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.

Get the value at a path into state. Refer to [State](#state) for all paths, and the types and access levels at each path.

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
      "missingPluginIntents" |
      "unavailablePath";
   message: string;
}
```

| Error Name             | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `unavailablePath`      | A value somewhere along the path is null                           |
| `missingPluginIntents` | The required read plugin intent for this path has not been granted |
| `invalidMessage`       | The message was malformed                                          |
| `internalError`        | Something went wrong inside PuryFi                                 |

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

## Outgoing `setState`

Requires different plugin intents depending on the passed path. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.

Set the value at a path into state. Refer to [State](#state) for all paths, and the types and access levels at each path.

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
      "missingPluginIntents" |
      "unavailablePath";
   message: string;
}
```

| Error Name             | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `unavailablePath`      | A value somewhere along the path is null                            |
| `missingPluginIntents` | The required write plugin intent for this path has not been granted |
| `invalidMessage`       | The message was malformed                                           |
| `internalError`        | Something went wrong inside PuryFi                                  |

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

## Outgoing `subscribeToState`

Requires different plugin intents depending on the passed path. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.

Subscribe to value change events at a path into state. Refer to [`unsubscribeFromState`](#outgoing-unsubscribefromstate) for the outgoing message to unsubscribe, and [`stateChange`](#incoming-statechange) for the incoming message received when the value at the path changes.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state to subscribe to.
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
   name: "internalError" | "invalidMessage" | "missingPluginIntents";
   message: string;
}
```

| Error Name             | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `missingPluginIntents` | The required read plugin intent for this path has not been granted |
| `invalidMessage`       | The message was malformed                                          |
| `internalError`        | Something went wrong inside PuryFi                                 |

### Examples

Refer to [`stateChange`](#incoming-statechange) for examples.

## Outgoing `unsubscribeFromState`

Requires different plugin intents depending on the passed path. Refer to [Plugin Intent](#pluginintent) for a full list of intents and what they allow.

Unsubscribe from value change events at a path into state. Refer to [`subscribeToState`](#outgoing-subscribetostate) for the outgoing message to subscribe, and [`stateChange`](#incoming-statechange) for the incoming message received when the value at the path changes.

### Arguments

```typescript
{
   path: string; // The dot-separated path into state to unsubscribe from.
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
   name: "internalError" | "invalidMessage" | "missingPluginIntents";
   message: string;
}
```

| Error Name             | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `missingPluginIntents` | The required read plugin intent for this path has not been granted |
| `invalidMessage`       | The message was malformed                                          |
| `internalError`        | Something went wrong inside PuryFi                                 |

### Examples

Refer to [`stateChange`](#incoming-statechange) for examples.

## Incoming `stateChange`

Received when a value at a path into state changes. The plugin must be subscribed to value change events at the path to receive this message. Refer to [`subscribeToState`](#outgoing-subscribetostate) for the outgoing message to subscribe, and [`unsubscribeFromState`](#outgoing-unsubscribefromstate) for the outgoing message to unsubscribe.

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
await connection.sendMessage("subscribeToState", {
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
         await connection.sendMessage("unsubscribeFromState", {
            path: "lockConfiguration.timer.endTime",
         });
         connection.off("message", "stateChange", listener);
      }
   }
});
```

## Outgoing `enterLockPassword`

Requires the `writeLockConfigurationState` plugin intent.

Enters a password for the set lock. If the password matches the one set for the lock, the lock is removed.

### Arguments

```typescript
{
   secret: string; // The password to enter.
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
   name: "incorrectLockPassword" |
      "noSetLockPassword" |
      "noSetLock" |
      "internalError" |
      "invalidMessage" |
      "missingPluginIntents";
   message: string;
}
```

| Error Name              | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `incorrectLockPassword` | The passed password does not match the one set for the lock          |
| `noSetLockPassword`     | No lock with a password is set                                       |
| `noSetLock`             | No lock is set                                                       |
| `missingPluginIntents`  | The `writeLockConfigurationState` plugin intent has not been granted |
| `invalidMessage`        | The message was malformed                                            |
| `internalError`         | Something went wrong inside PuryFi                                   |

## Outgoing `enterLockEmergencyServerToken`

Requires the `writeLockConfigurationState` plugin intent.

Enters an emergency server token for the set lock. If the token matches the one expected given the emergency client token of the lock, the lock is removed.

### Arguments

```typescript
{
   emergencyServerToken: string; // The emergency server token to enter.
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
   name: "incorrectLockEmergencyServerToken" |
      "noSetLock" |
      "internalError" |
      "invalidMessage" |
      "missingPluginIntents";
   message: string;
}
```

| Error Name                          | Description                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `incorrectLockEmergencyServerToken` | The passed emergency server token does not match the expected one for the lock |
| `noSetLock`                         | No lock is set                                                                 |
| `missingPluginIntents`              | The `writeLockConfigurationState` plugin intent has not been granted           |
| `invalidMessage`                    | The message was malformed                                                      |
| `internalError`                     | Something went wrong inside PuryFi                                             |

## Outgoing `scanStaticMedia`

Requires the `requestMediaProcesses` plugin intent.

Scan a static image.

### Arguments

```typescript
{
   image: Uint8Array; // The encoded data of the image to scan. Valid formats are PNG, JPG, JPEG, BMP, WEBP, AVIF, and GIF. If the image is animated, only the first frame is considered.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
   objects: Object[]; // The detected objects.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" |
      "invalidMessage" |
      "missingPluginIntents" |
      "invalidImage";
   message: string;
}
```

| Error Name             | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `invalidImage`         | The image data could not be decoded                            |
| `missingPluginIntents` | The `requestMediaProcesses` plugin intent has not been granted |
| `invalidMessage`       | The message was malformed                                      |
| `internalError`        | Something went wrong inside PuryFi                             |

### Examples

Scan a static image and log the detected objects:

```typescript
const res = await connection.sendMessage("scanStaticMedia", {
   image: image,
});

if (res.type === "ok") {
   for (const obj of res.objects) {
      console.log(
         `label=${obj.label} score=${obj.score} at (${obj.rect.x}, ${obj.rect.y}) ${obj.rect.width}x${obj.rect.height}`
      );
   }
}
```

## Outgoing `censorStaticMedia`

Requires the `requestMediaProcesses` plugin intent.

Censor a static image.

### Arguments

```typescript
{
   image: Uint8Array; // The encoded data of the image to censor. Valid formats are PNG, JPG, JPEG, BMP, WEBP, AVIF, and GIF. If the image is animated, only the first frame is considered.
   objects: Object[] | null; // The objects to use for the censor. If null, the image is scanned and the detected objects are used.
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
   image: Uint8Array; // The encoded data of the censored image in the same format as the passed image.
   objects: Object[]; // The objects used for the censor.
}
```

**Error:**

```typescript
{
   type: "error";
   name: "internalError" |
      "invalidMessage" |
      "missingPluginIntents" |
      "invalidImage";
   message: string;
}
```

| Error Name             | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `invalidImage`         | The image data could not be decoded                            |
| `missingPluginIntents` | The `requestMediaProcesses` plugin intent has not been granted |
| `invalidMessage`       | The message was malformed                                      |
| `internalError`        | Something went wrong inside PuryFi                             |

### Examples

Scan and censor a static image.

```typescript
const res = await connection.sendMessage("censorStaticMedia", {
   image: image,
   objects: null,
});

if (res.type === "ok") {
   image = res.image;
}
```

Scan a static image, then censor it using only the female and male face objects out of the detected ones.

```typescript
const scanRes = await connection.sendMessage("scanStaticMedia", {
   image: image,
   objects: null,
});

if (scanRes.type === "ok") {
   const filteredObjects = scanRes.objects.filter(
      (obj) => obj.label === Label.FemaleFace || obj.label === Label.MaleFace
   );

   const censorRes = await connection.sendMessage("censorStaticMedia", {
      image: image,
      objects: filteredObjects,
   });
}
```

## Outgoing `subscribeToStaticMediaScans`

Requires the `readMediaProcesses` plugin intent.

Subscribe to static media scan events happening as the user browses. Refer to [`unsubscribeFromStaticMediaScans`](#outgoing-unsubscribefromstaticmediascans) for the outgoing message to unsubscribe, and [`staticMediaScan`](#incoming-staticmediascan) for the incoming message received when a scan happens.

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
   name: "internalError" | "invalidMessage" | "missingPluginIntents";
   message: string;
}
```

| Error Name             | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `missingPluginIntents` | The `readMediaProcesses` plugin intent has not been granted |
| `invalidMessage`       | The message was malformed                                   |
| `internalError`        | Something went wrong inside PuryFi                          |

### Examples

Refer to [`staticMediaScan`](#incoming-staticmediascan) for examples.

## Outgoing `unsubscribeFromStaticMediaScans`

Requires the static media `readMediaProcesses` plugin intent.

Unsubscribe from scan events happening as the user browses. Refer to [`subscribeToStaticMediaScans`](#outgoing-subscribetostaticmediascans) for the outgoing message to subscribe, and [`staticMediaScan`](#incoming-staticmediascan) for the incoming message received when a scan happens.

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
   name: "internalError" | "invalidMessage" | "missingPluginIntents";
   message: string;
}
```

| Error Name             | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `missingPluginIntents` | The `readMediaProcesses` plugin intent has not been granted |
| `invalidMessage`       | The message was malformed                                   |
| `internalError`        | Something went wrong inside PuryFi                          |

### Examples

Refer to [`staticMediaScan`](#incoming-staticmediascan) for examples.

## Incoming `staticMediaScan`

Received when a static media scan happens as the user browses. The plugin must be subscribed to static media scan events to receive this message. Refer to [`subscribeToStaticMediaScans`](#outgoing-subscribetostaticmediascans) for the outgoing message to subscribe, and [`unsubscribeFromStaticMediaScans`](#outgoing-unsubscribefromstaticmediascans) for the outgoing message to unsubscribe.

### Arguments

```typescript
{
   objects: Object[]; // The detected objects.
}
```

### Examples

Subscribe to static media scan events, log the next 10 events, then unsubscribe.

```typescript
await connection.sendMessage("subscribeToStaticMediaScans", {});

let count = 0;
connection.on(
   "message",
   "staticMediaScan",
   async function listener({ objects }) {
      console.log(`${count}: Received scan event`);
      for (const obj of objects) {
         console.log(
            `label=${obj.label} score=${obj.score} at (${obj.rect.x}, ${obj.rect.y}) ${obj.rect.width}x${obj.rect.height}`
         );
      }

      count++;
      if (count >= 10) {
         console.log("Done receiving scan events");

         connection.off("message", "staticMediaScan", listener);
         await connection.sendMessage("unsubscribeFromStaticMediaScans", {});
      }
   }
);
```

## Types

## `PluginManifest`

```typescript
{
   name: null | string; // The plugin's name. This is only used for display purposes.
   version: null | string; // The plugin's version. This is only used for display purposes and is not required to follow any specific format.
   description: null | string; // The plugin's description.
   author: null | string; // The plugin's author.
   website: null | string; // The plugin's website.
}
```

## `PluginConfiguration`

```typescript
{
   [key: string]: PluginConfigurationField; // The fields of the plugin configuration.
}
```

## `PluginConfigurationField`

```typescript
{
   name: string; // The name of the field. This is only used for display purposes.
   type: "string" | "number" | "boolean"; // The type of the field.
   value: string | number | boolean; // The value of the field.
}
```

## `PluginIntent`

Plugin intents are required for sending and receiving most messages. Refer to [`requestPluginIntents`](#outgoing-requestpluginintents) for the outgoing message to request intents, [`getPendingPluginIntents`](#outgoing-getpendingpluginintents) for the outgoing message to get pending intents, and [`getPluginIntents`](#outgoing-getpluginintents) for the outgoing message to get granted intents.

| Value                           |
| ------------------------------- |
| `readEnabledState`              |
| `writeEnabledState`             |
| `readLockConfigurationState`    |
| `writeLockConfigurationState`   |
| `readWBlistConfigurationState`  |
| `writeWBlistConfigurationState` |
| `readUserState`                 |
| `readMediaProcesses`            |
| `requestMediaProcesses`         |

What each plugin intent allows is as follows:

| Value                           | Usage                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `readEnabledState`              | Allows sending the `getState`, `subscribeToState`, and `unsubscribeFromState` messages with the `enabled` path.            |
| `writeEnabledState`             | Allows sending the `setState` message with the `enabled` path.                                                             |
| `readLockConfigurationState`    | Allows sending the `getState`, `subscribeToState`, and `unsubscribeFromState` messages with `lockConfiguration.*` paths.   |
| `writeLockConfigurationState`   | Allows sending the `setState` message with `lockConfiguration.*` paths.                                                    |
| `readWBlistConfigurationState`  | Allows sending the `getState`, `subscribeToState`, and `unsubscribeFromState` messages with `wblistConfiguration.*` paths. |
| `writeWBlistConfigurationState` | Allows sending the `setState` message with `wblistConfiguration.*` paths.                                                  |
| `readUserState`                 | Allows sending the `getState`, `subscribeToState`, and `unsubscribeFromState` messages with `user.*` paths.                |
| `requestMediaProcesses`         | Allows sending the `scanStaticMedia` and `censorStaticMedia` messages.                                                     |
| `readMediaProcesses`            | Allows sending the `subscribeToStaticMediaScans` and `unsubscribeFromStaticMediaScans` messages.                           |

## `State`

The root state object. Paths passed to `getState`, `setState`, `subscribeToState`, and `unsubscribeFromState` are dot-separated paths into this type.

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

## `Object`

```typescript
{
   rect: Rect; // The coordinates of the object. The cordinates go from 0 to 1.
   label: number; // The "kind" of object detected. You can try mapping this to a Label for easier interpretation.
   score: number; // The confidence on the object being accurate. Goes from 0 to 1.
   id: number; // Unique ID of the object.
}
```

## `Rect`

```typescript
{
   x: number; // The x coordinate.
   y: number; // The y coordinate.
   width: number; // The width.
   height: number; // The height.
}
```

## `Label`

| Value | Name                    | Value | Name            |
| :---: | ----------------------- | :---: | --------------- |
|   0   | `Tummy`                 |  13   | `FaceMale`      |
|   1   | `TummyCovered`          |  14   | `FootCovered`   |
|   2   | `Buttocks`              |  15   | `Foot`          |
|   3   | `ButtocksCovered`       |  16   | `ArmpitCovered` |
|   4   | `FemaleBreast`          |  17   | `Armpit`        |
|   5   | `FemaleBreastCovered`   |  18   | `AnusCovered`   |
|   6   | `FemaleGenitals`        |  19   | `Anus`          |
|   7   | `FemaleGenitalsCovered` |  20   | `Eye`           |
|   8   | `MaleGenitalsCovered`   |  21   | `Mouth`         |
|   9   | `MaleGenitals`          |  22   | `NippleCovered` |
|  10   | `MaleBreast`            |  23   | `Nipple`        |
|  11   | `MaleBreastCovered`     |  24   | `HandCovered`   |
|  12   | `FaceFemale`            |  25   | `Hand`          |
