# PuryFi Media Processing API Reference

> Scan and censor images through PuryFi's detection engine, and subscribe to real-time scan events.

## Table of Contents

- [Overview](#overview)
- [Required Intents](#required-intents)
- [Scanning Images](#scanning-images)
- [Censoring Images](#censoring-images)
- [Watching Live Scans](#watching-live-scans)
- [Detection Objects](#detection-objects)
- [Labels](#labels)

---

## Overview

The Media Processing API lets plugins interact with PuryFi's image scanning and censoring pipeline. There are two uses:

- Send images for scanning or censoring.
- Subscribe to scan events happening as the user browses.

All operations use `connection.sendMessage()`:

| Message                   | Direction       | Description                  |
| ------------------------- | --------------- | ---------------------------- |
| `scanStaticMedia`         | Plugin → PuryFi | Scan a static image          |
| `censorStaticMedia`       | Plugin → PuryFi | Censor a static image        |
| `watchStaticMediaScans`   | Plugin → PuryFi | Subscribe to scan events     |
| `unwatchStaticMediaScans` | Plugin → PuryFi | Unsubscribe from scan events |
| `staticMediaScan`         | PuryFi → Plugin | Notify of a scan event       |

---

## Required Intents

See the [Intents section in the README](../README.md#intents) for the full list of available intents. The media-related intents are:

| Intent                  | Enables                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `requestMediaProcesses` | `scanStaticMedia`, `censorStaticMedia`                                |
| `readMediaProcesses`    | `watchStaticMediaScans`, `unwatchStaticMediaScans`, `staticMediaScan` |

---

## Scanning Images

Send an image to PuryFi for scanning.

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

### Arguments

```typescript
{
   image: Uint8Array; // encoded data of the image to scan
}
```

### Return

**Success:**

```typescript
{
   type: "ok";
   objects: Object[]; // objects
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

| Error Name       | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `invalidImage`   | The image data could not be decoded                     |
| `missingIntents` | The `requestMediaProcesses` intent has not been granted |
| `invalidMessage` | The message was malformed                               |
| `internalError`  | Something went wrong inside PuryFi                      |

---

## Censoring Images

Send an image to PuryFi for censoring. You can either pass the objects to use for the censor or let PuryFi scan the image and use those.

```typescript
const res = await connection.sendMessage("censorStaticMedia", {
   image: imageBytes, // Uint8Array — encoded data of the image to censor
   objects: null, // Objects[] | null — objects to use for the censor, or null to scan the image and use those.
});

if (res.type === "ok") {
   // res.image — Uint8Array — encoded data of the censored image
   // res.objects — objects used for the censor
   const censoredImage = res.image;
}
```

To censor specific objects (e.g. from a previous scan), pass them in the `objects` field:

```typescript
// Scan first, then selectively censor
const scanRes = await connection.sendMessage("scanStaticMedia", {
   image: imageBytes,
});

if (scanRes.type === "ok") {
   // Filter to only censor certain labels
   const toCensor = scanRes.objects.filter((obj) => obj.label === 4);

   const censorRes = await connection.sendMessage("censorStaticMedia", {
      image: imageBytes,
      objects: toCensor,
   });
}
```

### Response

**Success:**

```typescript
{
   type: "ok";
   image: Uint8Array;   // the censored image
   objects: Object[];    // the objects that were detected/censored
}
```

**Error:** Same error names as `scanStaticMedia`.

---

## Watching Live Scans

Subscribe to real-time scan events happening inside PuryFi as the user browses. Each event delivers the detected objects from a scan.

```typescript
// Start watching
const res = await connection.sendMessage("watchStaticMediaScans", {});

if (res.type === "ok") {
   // Listen for scan events
   connection.on("message", "staticMediaScan", (payload) => {
      console.log(`Scan detected ${payload.objects.length} objects`);
      for (const obj of payload.objects) {
         console.log(`  label=${obj.label} score=${obj.score} id=${obj.id}`);
      }
   });
}
```

To stop receiving events:

```typescript
await connection.sendMessage("unwatchStaticMediaScans", {});
```

### `staticMediaScan` Payload

```typescript
{
   objects: Object[];
}
```

### Watch/Unwatch Errors

```typescript
{
   type: "error";
   name: "internalError" | "invalidMessage" | "missingIntents";
}
```

---

## Detection Objects

Each detected object describes a region of the image and what was found there.

```typescript
interface Object {
   rect: Rect; // bounding box
   label: number; // what was detected (see Labels)
   score: number; // confidence score (0–1)
   id: number; // unique identifier for this detection
}

interface Rect {
   x: number; // left edge
   y: number; // top edge
   width: number; // box width
   height: number; // box height
}
```

Both types and the `Label` enum are exported from the SDK:

```typescript
import { Object, Rect, Label } from "@pury-fi/plugin-sdk";
```

### Validation Helpers

The SDK exports type guard functions for runtime validation:

```typescript
import { isObject, isRect } from "@pury-fi/plugin-sdk";

if (isObject(value)) {
   // value is Object
}

if (isRect(value)) {
   // value is Rect
}
```

---

## Labels

The `Label` enum maps numeric label values to body part identifiers. Use it to filter or interpret detection results.

```typescript
import { Label } from "@pury-fi/plugin-sdk";

// Filter to only face detections
const faces = objects.filter(
   (obj) => obj.label === Label.FaceFemale || obj.label === Label.FaceMale
);
```

### All Labels

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

### Label Patterns

Labels follow a convention: uncovered variants use even numbers; their covered counterparts use `value + 1` (odd):

| Uncovered            | Covered                     |
| -------------------- | --------------------------- |
| `Tummy (0)`          | `TummyCovered (1)`          |
| `Buttocks (2)`       | `ButtocksCovered (3)`       |
| `FemaleBreast (4)`   | `FemaleBreastCovered (5)`   |
| `FemaleGenitals (6)` | `FemaleGenitalsCovered (7)` |
| `MaleGenitals (9)`   | `MaleGenitalsCovered (8)`   |
| `MaleBreast (10)`    | `MaleBreastCovered (11)`    |
| `Foot (15)`          | `FootCovered (14)`          |
| `Armpit (17)`        | `ArmpitCovered (16)`        |
| `Anus (19)`          | `AnusCovered (18)`          |
| `Nipple (23)`        | `NippleCovered (22)`        |
| `Hand (25)`          | `HandCovered (24)`          |
