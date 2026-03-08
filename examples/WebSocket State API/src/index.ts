import PuryFiSocket from "@puryfi/plugin-sdk/socket";
import {
   PuryFiConnection,
   PuryFiConnectionError,
} from "@puryfi/plugin-sdk";
import type {
   PluginConfiguration,
   PluginManifest,
   Intent,
} from "@puryfi/plugin-sdk";

/**
 * WebSocket Example
 *
 * This example demonstrates a standalone WebSocket plugin that:
 * - Connects to PuryFi and completes the handshake
 * - Reads and watches PuryFi's state (enabled status, lock configuration)
 * - Writes to state (whitelist/blacklist configuration)
 * - Handles user-editable configuration fields
 */

const upstreamConnection = new PuryFiSocket(8080);
const connection = new PuryFiConnection(upstreamConnection);

upstreamConnection.setDebug(true);
connection.setDebug(true);

const intents: Intent[] = [
   "readEnabled",
   "writeEnabled",
   "readLockConfiguration",
   "readWBlistConfiguration",
   "writeWBlistConfiguration",
   "readUser",
];

const manifest: PluginManifest = {
   name: "State Manager Plugin",
   version: "1.0.0",
   description: "Demonstrates reading, writing, and watching PuryFi state",
   author: null,
   website: null,
};

let configuration: PluginConfiguration = {
   autoEnableOnLock: {
      value: true,
      type: "boolean",
      name: "Auto-enable PuryFi when locked",
   },
   blockedSite: {
      value: "example.com",
      type: "string",
      name: "Site to add to blacklist",
   },
};

connection.on("error", (error: PuryFiConnectionError) => {
   console.error("Connection error:", error.message);
});

connection.on("close", () => {
   console.log("Connection to PuryFi closed");
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

   console.log(
      `PuryFi ${version} (API ${apiVersion}) connected`
   );

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

   if (!intents.every((i) => grantedResponse.intents.includes(i))) {
      console.log("Requesting intents from user...");

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
      const oldConfig = configuration;
      configuration = payload.configuration;

      // React to specific field changes
      if (oldConfig.autoEnableOnLock.value !== configuration.autoEnableOnLock.value) {
         console.log(
            `Auto-enable on lock: ${configuration.autoEnableOnLock.value ? "ON" : "OFF"}`
         );
      }

      if (oldConfig.blockedSite.value !== configuration.blockedSite.value) {
         console.log(`Blocked site updated to: ${configuration.blockedSite.value}`);
      }
   });

   // ── Read current state ────────────────────────────────────────────

   const enabledRes = await connection.sendMessage("getState", {
      path: "enabled",
   });
   if (enabledRes.type === "ok") {
      console.log(`PuryFi is currently ${enabledRes.value ? "enabled" : "disabled"}`);
   }

   const userRes = await connection.sendMessage("getState", {
      path: "user",
   });
   if (userRes.type === "ok" && userRes.value !== null) {
      console.log(
         `Logged in as ${userRes.value.username} (${userRes.value.supportTier.name})`
      );
   }

   const lockRes = await connection.sendMessage("getState", {
      path: "lockConfiguration",
   });
   if (lockRes.type === "ok" && lockRes.value !== null) {
      console.log(`Lock active since ${new Date(lockRes.value.startTime).toLocaleString()}`);
      if (lockRes.value.timer) {
         console.log(`Timer lock expires at ${new Date(lockRes.value.timer.endTime).toLocaleString()}`);
      }
      if (lockRes.value.password) {
         console.log("Password lock is active");
      }
   } else {
      console.log("No lock is currently active");
   }

   // ── Watch for state changes ───────────────────────────────────────

   await connection.sendMessage("watchState", { path: "enabled" });
   await connection.sendMessage("watchState", { path: "lockConfiguration" });
   await connection.sendMessage("watchState", {
      path: "wblistConfiguration.mode",
   });

   connection.on("message", "stateChange", (payload) => {
      switch (payload.path) {
         case "enabled":
            console.log(
               `\n[State] PuryFi ${payload.value ? "enabled" : "disabled"}`
            );
            break;

         case "lockConfiguration":
            if (payload.value !== null) {
               console.log("\n[State] Lock activated");

               // If auto-enable is on, enable PuryFi when a lock is set
               if (configuration.autoEnableOnLock.value) {
                  connection
                     .sendMessage("setState", {
                        path: "enabled",
                        value: true,
                     })
                     .then((res) => {
                        if (res.type === "ok") {
                           console.log(
                              "[Action] Auto-enabled PuryFi due to lock activation"
                           );
                        }
                     });
               }
            } else {
               console.log("\n[State] Lock deactivated");
            }
            break;

         case "wblistConfiguration.mode":
            console.log(`\n[State] List mode changed to: ${payload.value}`);
            break;
      }
   });

   // ── Write to state: add a site to the blacklist ───────────────────

   const wblistRes = await connection.sendMessage("getState", {
      path: "wblistConfiguration.blacklist",
   });
   if (wblistRes.type === "ok") {
      const currentBlacklist = wblistRes.value;
      const siteToBlock = configuration.blockedSite.value as string;

      // Only add if not already present
      if (!currentBlacklist.some((entry) => entry.value === siteToBlock)) {
         const updatedBlacklist = [
            ...currentBlacklist,
            { mode: "text" as const, value: siteToBlock },
         ];

         const setRes = await connection.sendMessage("setState", {
            path: "wblistConfiguration.blacklist",
            value: updatedBlacklist,
         });

         if (setRes.type === "ok") {
            console.log(`Added "${siteToBlock}" to blacklist`);
         } else {
            console.error(`Failed to update blacklist: ${setRes.message}`);
         }
      } else {
         console.log(`"${siteToBlock}" is already in the blacklist`);
      }
   }
});
