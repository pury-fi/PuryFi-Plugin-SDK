import * as SDK from "@pury-fi/plugin-sdk/browser-extension";

// Step 1 — Open a Connection

// Create a connection to PuryFi in the same browser.
const connection = new SDK.BrowserExtensionConnection();

// Wait for the connection to open.
connection.once("open", async () => {
   // Step 2 — Handle the Handshake

   // Wait for the ready message.
   await new Promise<void>((resolve) => {
      connection.once("message", "ready", (payload) => {
         // Delegate responding to the connection itself. The connection will return an error response if the API version is of a different major than the SDK was built for, which should be the correct course of action in the majority of cases.
         const res = connection.handleReadyMessage(payload);
         if (res.type === "ok") {
            resolve();
         }
         return res;
      });
   });

   // Step 3 — Send a Manifest and Configuration

   // Declare and send a manifest.
   let manifest: SDK.PluginManifest = {
      name: "Minimal Plugin",
      version: "1.0.0",
      description: "A minimal browser extension plugin example",
      author: null,
      website: null,
   };
   await connection
      .sendMessage("setPluginManifest", { manifest })
      .then((res) => {
         // Throw if we get an error response.
         if (res.type === "error") {
            throw new Error(`Failed to set plugin manifest: ${res.message}`);
         }
      });

   // Declare and send a configuration.
   let configuration: SDK.PluginConfiguration = {};
   await connection
      .sendMessage("setPluginConfiguration", { configuration })
      .then((res) => {
         // Throw if we get an error response.
         if (res.type === "error") {
            throw new Error(
               `Failed to set plugin configuration: ${res.message}`
            );
         }
      });

   // Handle configuration change events.
   connection.on("message", "configurationChange", (payload) => {
      // Assign the new configuration.
      configuration = payload.configuration;
   });

   // Step 4 — Request Intents

   // Declare your desired intents.
   const intents: SDK.PluginIntent[] = [];

   // Get the intents that have been granted in the past.
   const { intents: grantedIntents } = await connection
      .sendMessage("getPluginIntents", {})
      .then((res) => {
         // Throw if we get an error response.
         if (res.type === "error") {
            throw new Error(`Failed to get plugin intents: ${res.message}`);
         }
         return res;
      });

   // Check if any desired intents have not been granted.
   if (!intents.every((intent) => grantedIntents.includes(intent))) {
      // Request the desired intents.
      await connection
         .sendMessage("requestPluginIntents", { intents })
         .then((res) => {
            // Throw if we get an error response.
            if (res.type === "error") {
               throw new Error(
                  `Failed to request plugin intents: ${res.message}`
               );
            }
         });

      // Wait for intents to be granted.
      await new Promise<void>((resolve) => {
         connection.on(
            "message",
            "intentsGrant",
            function listener({ intents: grantedIntents }) {
               // Check if all desired intents have been granted, and if so, proceed.
               if (intents.every((intent) => grantedIntents.includes(intent))) {
                  connection.off("message", "intentsGrant", listener);
                  resolve();
               }
            }
         );
      });
   }

   // Implement the main functionality of the plugin here...
});
