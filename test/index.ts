import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import {
   PluginConfiguration,
   PluginManifest,
   PuryFiConnection,
   PuryFiConnectionError,
} from "@puryfi/puryfi-plugin-sdk";
import { Intent } from "../dist/esm/core/messages";

const upstreamConnection = new PuryFiSocket(8085);
upstreamConnection.setDebug(true);
const connection = new PuryFiConnection(upstreamConnection);
connection.setDebug(true);

const intents: Intent[] = [];

const manifest: PluginManifest = {
   name: "Example Plugin",
   version: "1.0.0",
   description: "An example plugin",
   author: null,
   website: null,
};

const configuration: PluginConfiguration = {
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
   console.log("Connected to PuryFi");

   connection.once("message", "ready", async ({ version }) => {
      console.log(`Connected PuryFi ${version} is ready to receive messages`);

      await connection.sendMessage("setManifest", { manifest });

      await connection.sendMessage("setConfiguration", {
         configuration,
      });

      const response = await connection.sendMessage("getIntents", {});

      if (!intents.every((intent) => response.intents.includes(intent))) {
         await new Promise<void>(async (resolve) => {
            connection.on(
               "message",
               "intentsGrant",
               async function listener({ intents }) {
                  console.log("Received intentsGrant message", intents);
                  if (
                     response.intents.every((intent) =>
                        intents.includes(intent)
                     )
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
});
