import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import {
   PuryFiConnection,
   PuryFiConnectionError,
} from "@puryfi/puryfi-plugin-sdk";
import type {
   PluginConfiguration,
   PluginManifest,
   Intent,
} from "@puryfi/puryfi-plugin-sdk";

/**
 * This example demonstrates how to set up a WebSocket server using PuryFiSocket and establish a connection with PuryFi using PuryFiConnection.
 */
const upstreamConnection = new PuryFiSocket(8080);
const connection = new PuryFiConnection(upstreamConnection);

/**
 * The debug mode is enabled for both the upstream connection and the main connection to log detailed information about the connection process and message handling.
 * This can be helpful for development and troubleshooting purposes.
 */
upstreamConnection.setDebug(true);
connection.setDebug(true);

/**
 * Intents represent the permissions that the plugin requires to function properly. In this example, the intents array is empty, which means that the plugin does not require any special permissions.
 * In a real plugin, you would populate this array with the specific intents that your plugin needs, such as "readUser", "writeLockConfiguration", etc.
 * The plugin will request these intents from PuryFi, and the user will have the option to grant or deny them.
 * It's important to only request the intents that are necessary for your plugin's functionality to ensure a better user experience and maintain trust.
 */
const intents: Intent[] = [];

/**
 * The manifest object contains metadata about the plugin, such as its name, version, description, author, and website.
 * This information is used by PuryFi to display details about the plugin to users and can also be useful for plugin management and updates.
 * The configuration object defines the settings that the plugin can be configured with. In this example, there is a single configuration field called "exampleField" of type "number" with an initial value of 0.
 * In a real plugin, you would define configuration fields that are relevant to your plugin's functionality, allowing users to customize the behavior of the plugin through the PuryFi interface.
 */
let manifest: PluginManifest = {
   name: "Example Plugin",
   version: "1.0.0",
   description: "An example plugin",
   author: null,
   website: null,
};

let configuration: PluginConfiguration = {
   exampleField: {
      value: 0,
      type: "number",
      name: "Example field",
   },
};

connection.on("error", (error: PuryFiConnectionError) => {
   console.log(error.message);
});

connection.once("open", async () => {
   console.log(`Connected to PuryFi`);

   let { version, apiVersion } = await new Promise<{
      version: string;
      apiVersion: string;
   }>((resolve) => {
      connection.on("message", "ready", function listener(payload) {
         const response = connection.handleReadyMessage(payload);
         if (response.type === "ok") {
            resolve(payload);
         }
         return response;
      });
   });

   console.log(
      `Connected PuryFi ${version} with plugins API ${apiVersion} is ready to receive messages`
   );

   /**
    * The plugin sends a series of messages to PuryFi to set up the plugin's manifest, configuration, and request the necessary intents.
    */
   await connection
      .sendMessage("setManifest", { manifest })
      .then((response) => {
         if (response.type === "error") {
            throw new Error("Received error response");
         }
         return response;
      });

   await connection
      .sendMessage("setConfiguration", {
         configuration,
      })
      .then((response) => {
         if (response.type === "error") {
            throw new Error(`Received error response: ${response.message}`);
         }
         return response;
      });

   connection.on("message", "configurationChange", async (payload) => {
      console.log("Configuration changed: ", payload.configuration);
      configuration = payload.configuration;
   });

   /**
    * The plugin checks if the required intents are already granted by sending a "getIntents" message to PuryFi.
    * If any of the required intents are not granted, the plugin sends a "requestIntents" message to request those intents from the user.
    */
   const response = await connection
      .sendMessage("getIntents", {})
      .then((response) => {
         if (response.type === "error") {
            throw new Error(`Received error response: ${response.message}`);
         }
         return response;
      });

   if (!intents.every((intent) => response.intents.includes(intent))) {
      await new Promise<void>(async (resolve) => {
         connection.on(
            "message",
            "intentsGrant",
            async function listener({ intents }) {
               if (
                  intents.every((intent) => response.intents.includes(intent))
               ) {
                  console.log("Required intents granted");

                  connection.off("message", "intentsGrant", listener);

                  resolve();
               }
            }
         );

         await connection.sendMessage("requestIntents", {
            intents,
         });
      });
   }
});
