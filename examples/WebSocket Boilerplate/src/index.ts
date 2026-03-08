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
 * WebSocket Boilerplate
 *
 * This is a boilerplate example for building a PuryFi plugin using the WebSocket SDK. It sets up the connection, completes the handshake, and provides placeholders for requesting intents, handling configuration, and implementing plugin features.
 */

const upstreamConnection = new PuryFiSocket(8080);
const connection = new PuryFiConnection(upstreamConnection);

upstreamConnection.setDebug(true);
connection.setDebug(true);

const intents: Intent[] = [
   /**
    * Specify your required intents here.
    */
];

const manifest: PluginManifest = {
   name: "Plugin Boilerplate",
   version: "1.0.0",
   description:
      "Boilerplate for building a PuryFi plugin using the WebSocket SDK",
   author: null,
   website: null,
};

let configuration: PluginConfiguration = {
   /**
    * Define your plugin's user-editable configuration fields here. These will show up in PuryFi's settings UI and can be updated by the user, with changes coming through the "configurationChange" message.
    */
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
      configuration = payload.configuration;

      /**
       * Handle configuration changes for your plugin coming from PuryFi's settings UI here.
       */
   });

   /**
    * Start implementing your plugin's features here. You can listen for messages from PuryFi, send messages to PuryFi, and use the granted intents to interact with PuryFi's state and events.
    * You can look at the documentation and other examples for guidance on how to use the SDK to build your plugin's functionality.
    */
});
