import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import {
   PluginConfiguration,
   PluginManifest,
   PuryFiConnection,
} from "@puryfi/puryfi-plugin-sdk";
import { Intent } from "../dist/esm/core/messages";

const upstreamConnection = new PuryFiSocket(8085);
upstreamConnection.setDebug(true);
const connection = new PuryFiConnection(upstreamConnection);
connection.setDebug(true);

const intents: Intent[] = [
   "readEnabled",
   "writeEnabled",
   "readLockConfiguration",
   "writeLockConfiguration",
];

const manifest: PluginManifest = {
   name: "Example Plugin",
   version: "1.0.0",
   description: "An example plugin",
};

const configuration: PluginConfiguration = {
   exampleField: {
      value: 0,
      type: "number",
      name: "Example Field",
   },
};

connection.once("open", async () => {
   console.log("Connected to PuryFi extension");

   connection.once("message", "ready", async ({ version }) => {
      console.log(`Connected PuryFi ${version} is ready to receive messages`);

      console.log("Setting manifest");
      await connection.sendMessage("setManifest", { manifest });

      console.log("Setting configuration");
      await connection.sendMessage("setConfiguration", {
         configuration,
      });

      console.log("Requesting intents");
      const response = await connection.sendMessage("getIntents", {});

      console.log("Received intents", response.intents);

      if (!intents.every((intent) => response.intents.includes(intent))) {
         await new Promise<void>(async (resolve) => {
            connection.on(
               "message",
               "intentsGranted",
               async function listener({ intents }) {
                  if (
                     intents.every((intent) =>
                        response.intents.includes(intent)
                     )
                  ) {
                     console.log("Required intents granted");

                     connection.off("message", "intentsGranted", listener);

                     resolve();
                  }
               }
            );

            console.log("Requesting intents");
            await connection.sendMessage("requestIntents", {
               intents,
            });
         });
      }
   });
});
