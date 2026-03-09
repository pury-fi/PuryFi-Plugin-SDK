import PuryFiBrowser from "@pury-fi/plugin-sdk/browser";
import {
   PuryFiConnection,
   PuryFiConnectionError,
   Label,
} from "@pury-fi/plugin-sdk";
import type {
   PluginConfiguration,
   PluginManifest,
   Intent,
} from "@pury-fi/plugin-sdk";

/**
 * Chromium Extension Example
 *
 * This example demonstrates a browser extension plugin that:
 * - Connects to PuryFi via the BroadcastChannel bridge (Chromium)
 * - Watches for live media scan events and logs detection statistics
 * - Reads and watches the whitelist/blacklist configuration
 * - Handles user-editable configuration with a detection score threshold
 */

const upstreamConnection = new PuryFiBrowser();
const connection = new PuryFiConnection(upstreamConnection);

upstreamConnection.setDebug(true);
connection.setDebug(true);

const intents: Intent[] = [
   "readEnabled",
   "readWBlistConfiguration",
   "readMediaProcesses",
   "readUser",
];

const manifest: PluginManifest = {
   name: "Detection Monitor",
   version: "1.0.0",
   description: "Monitors PuryFi media scans and logs detection statistics",
   author: null,
   website: null,
};

let configuration: PluginConfiguration = {
   scoreThreshold: {
      value: 0.7,
      type: "number",
      name: "Minimum confidence score to log",
   },
   logFaces: {
      value: false,
      type: "boolean",
      name: "Include face detections in log",
   },
};

// Track detection statistics across scans
let totalScans = 0;
let totalDetections = 0;
const detectionsByLabel: Record<number, number> = {};

connection.on("error", (error: PuryFiConnectionError) => {
   console.error("Connection error:", error.message);
});

connection.on("close", () => {
   console.log("Connection to PuryFi closed");
   console.log(
      `Session summary: ${totalScans} scans, ${totalDetections} detections`
   );
});

connection.once("open", async () => {
   // ── Handshake ──────────────────────────────────────────────────────

   const { version, apiVersion } = await new Promise<{
      version: string;
      apiVersion: string;
   }>((resolve) => {
      connection.on("message", "ready", (payload) => {
         const response = connection.handleReadyMessage(payload);
         if (response.type === "ok") resolve(payload);
         return response;
      });
   });

   console.log(`PuryFi ${version} (API ${apiVersion}) connected`);

   console.log(`PuryFi ${version} (API ${apiVersion}) connected`);

   await connection.sendMessage("setManifest", { manifest }).then((res) => {
      if (res.type === "error") throw new Error("Failed to set manifest");
   });

   await connection
      .sendMessage("setConfiguration", { configuration })
      .then((res) => {
         if (res.type === "error")
            throw new Error(`Failed to set configuration: ${res.message}`);
      });

   // ── Request intents ────────────────────────────────────────────────

   const grantedResponse = await connection
      .sendMessage("getIntents", {})
      .then((res) => {
         if (res.type === "error")
            throw new Error(`Failed to get intents: ${res.message}`);
         return res;
      });

   if (
      grantedResponse.type === "ok" &&
      !intents.every((i) => grantedResponse.intents.includes(i))
   ) {
      await new Promise<void>(async (resolve) => {
         connection.on(
            "message",
            "intentsGrant",
            function listener({ intents: granted }) {
               if (intents.every((i) => granted.includes(i))) {
                  console.log("All required intents granted");
                  connection.off("message", "intentsGrant", listener);
                  resolve();
               }
            }
         );

         await connection.sendMessage("requestIntents", { intents });
      });
   }

   console.log("Plugin initialized — starting features\n");

   // ── Handle configuration changes ──────────────────────────────────

   connection.on("message", "configurationChange", (payload) => {
      configuration = payload.configuration;
      console.log(
         `Config updated — threshold: ${configuration.scoreThreshold.value}, ` +
            `faces: ${configuration.logFaces.value ? "on" : "off"}`
      );
   });

   // ── Read initial state ────────────────────────────────────────────

   const enabledRes = await connection.sendMessage("getState", {
      path: "enabled",
   });
   if (enabledRes.type === "ok") {
      console.log(
         `PuryFi is ${enabledRes.value ? "enabled" : "disabled"}`
      );
   }

   const userRes = await connection.sendMessage("getState", {
      path: "user",
   });
   if (userRes.type === "ok" && userRes.value !== null) {
      console.log(`User: ${userRes.value.username}`);
   }

   const wblistRes = await connection.sendMessage("getState", {
      path: "wblistConfiguration",
   });
   if (wblistRes.type === "ok") {
      console.log(
         `List mode: ${wblistRes.value.mode}, ` +
            `${wblistRes.value.whitelist.length} whitelist entries, ` +
            `${wblistRes.value.blacklist.length} blacklist entries`
      );
   }

   // ── Watch enabled state ───────────────────────────────────────────

   await connection.sendMessage("watchState", { path: "enabled" });

   connection.on("message", "stateChange", (payload) => {
      if (payload.path === "enabled") {
         console.log(
            `\n[State] PuryFi ${payload.value ? "enabled" : "disabled"}`
         );

         if (payload.value) {
            console.log("  Detection monitoring is active");
         } else {
            console.log("  Detection monitoring paused (PuryFi disabled)");
         }
      }
   });

   // ── Watch live media scans ────────────────────────────────────────

   const watchRes = await connection.sendMessage("watchStaticMediaScans", {});
   if (watchRes.type === "ok") {
      console.log("Watching live media scans\n");
   }

   connection.on("message", "staticMediaScan", (payload) => {
      totalScans++;

      const threshold = configuration.scoreThreshold.value as number;
      const includeFaces = configuration.logFaces.value as boolean;

      // Filter detections by threshold and face preference
      const relevant = payload.objects.filter((obj) => {
         if (obj.score < threshold) return false;

         // Skip face labels unless the user opted in
         if (
            !includeFaces &&
            (obj.label === Label.FaceFemale || obj.label === Label.FaceMale)
         ) {
            return false;
         }

         return true;
      });

      if (relevant.length === 0) return;

      totalDetections += relevant.length;

      console.log(
         `\n[Scan #${totalScans}] ${relevant.length} detection(s) above ${threshold} threshold:`
      );

      for (const obj of relevant) {
         const labelName = Label[obj.label] ?? `Unknown(${obj.label})`;

         // Track per-label counts
         detectionsByLabel[obj.label] =
            (detectionsByLabel[obj.label] ?? 0) + 1;

         console.log(
            `  ${labelName} — score: ${obj.score.toFixed(2)}, ` +
               `position: (${obj.rect.x}, ${obj.rect.y}), ` +
               `size: ${obj.rect.width}x${obj.rect.height}`
         );
      }

      // Print running totals every 10 scans
      if (totalScans % 10 === 0) {
         console.log(`\n[Stats] After ${totalScans} scans:`);
         console.log(`  Total detections: ${totalDetections}`);
         for (const [label, count] of Object.entries(detectionsByLabel)) {
            const labelName = Label[Number(label)] ?? `Unknown(${label})`;
            console.log(`  ${labelName}: ${count}`);
         }
      }
   });
});
