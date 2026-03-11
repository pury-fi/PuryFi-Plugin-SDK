# PuryFi Media Processing API Reference

> Scan and censor images, and subscribe to scan events happening as the user browses.

## Table of Contents

- [Overview](#overview)
- [Relevant Intents](#relevant-intents)
- [Messages](#messages)
   - [`scanStaticMedia`](#scanstaticmedia)
   - [`censorStaticMedia`](#censorstaticmedia)
   - [`watchStaticMediaScans`](#watchstaticmediascans)
   - [`unwatchStaticMediaScans`](#unwatchstaticmediascans)
   - [`staticMediaScan`](#staticmediascan)
- [Types](#types)
   - [`Object`](#object)
   - [`Rect`](#rect)
   - [`Label`](#label)

## Overview

The Media Processing API lets plugins interact with PuryFi's image scanning and censoring pipeline.

Outgoing messages are sent with `PuryFiConnection.sendMessage`, and incoming messages are received with `PuryFiConnection.on`.

| Message                   | Direction       | Description                  |
| ------------------------- | --------------- | ---------------------------- |
| `scanStaticMedia`         | Plugin → PuryFi | Scan a static image          |
| `censorStaticMedia`       | Plugin → PuryFi | Censor a static image        |
| `watchStaticMediaScans`   | Plugin → PuryFi | Subscribe to scan events     |
| `unwatchStaticMediaScans` | Plugin → PuryFi | Unsubscribe from scan events |
| `staticMediaScan`         | PuryFi → Plugin | Notify of a scan event       |

## Intents

See the [Intents section in the README](../README.md#intents) for the full list of intents.

| Intent                       | Enables                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `requestMediaProcessesState` | `scanStaticMedia`, `censorStaticMedia`                                    |
| `readMediaProcessesState`    | `watchStaticMediaScans`, `unwatchStaticMediaScans`, and `staticMediaScan` |

## Messages

## `scanStaticMedia`

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
   name: "internalError" | "invalidMessage" | "missingIntents" | "invalidImage";
   message: string;
}
```

| Error Name       | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `invalidImage`   | The image data could not be decoded                          |
| `missingIntents` | The `requestMediaProcessesState` intent has not been granted |
| `invalidMessage` | The message was malformed                                    |
| `internalError`  | Something went wrong inside PuryFi                           |

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

## `censorStaticMedia`

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
   name: "internalError" | "invalidMessage" | "missingIntents" | "invalidImage";
   message: string;
}
```

| Error Name       | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `invalidImage`   | The image data could not be decoded                          |
| `missingIntents` | The `requestMediaProcessesState` intent has not been granted |
| `invalidMessage` | The message was malformed                                    |
| `internalError`  | Something went wrong inside PuryFi                           |

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

## `watchStaticMediaScans`

Subscribe to scan events happening as the user browses. Refer to [`unwatchStaticMediaScans`](#unwatchstaticmediascans) for the message to unsubscribe, and [`staticMediaScan`](#staticmediascan) for the message received when a scan happens.

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

| Error Name       | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `missingIntents` | The `readMediaProcessesState` intent has not been granted |
| `invalidMessage` | The message was malformed                                 |
| `internalError`  | Something went wrong inside PuryFi                        |

### Examples

Refer to [`staticMediaScan`](#staticmediascan) for examples.

## `unwatchStaticMediaScans`

Unsubscribe from scan events happening as the user browses. Refer to [`watchStaticMediaScans`](#watchstaticmediascans) for the message to subscribe, and [`staticMediaScan`](#staticmediascan) for the message received when a scan happens.

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

| Error Name       | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `missingIntents` | The `readMediaProcessesState` intent has not been granted |
| `invalidMessage` | The message was malformed                                 |
| `internalError`  | Something went wrong inside PuryFi                        |

### Examples

Refer to [`staticMediaScan`](#staticmediascan) for examples.

## `staticMediaScan`

Received when a scan happens as the user browses. Refer to [`watchStaticMediaScans`](#watchstaticmediascans) for the message to subscribe, and [`unwatchStaticMediaScans`](#unwatchstaticmediascans) for the message to unsubscribe.

### Arguments

```typescript
{
   objects: Object[]; // The detected objects.
}
```

### Examples

Subscribe to static media scan events, log the next 10 events, then unsubscribe.

```typescript
await connection.sendMessage("watchStaticMediaScans", {});

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
         await connection.sendMessage("unwatchStaticMediaScans", {});
      }
   }
);
```

## Types

## `Object`

```typescript
{
   rect: Rect; // The coordinates of the object. The cordinates go from 0 to 1.
   label: number; // The "kind" of object detected. You can try mapping this to a [`Label`](#labels) for easier interpretation.
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
