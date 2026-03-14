import * as SDK from "@pury-fi/plugin-sdk/websocket";

const server = new SDK.WebSocketServer(8080);

server.once("connection", (connection) => {
   connection.once("open", async () => {
      await new Promise<void>((resolve) => {
         connection.once("message", "ready", (payload) => {
            const res = connection.handleReadyMessage(payload);
            if (res.type === "ok") {
               resolve();
            }
            return res;
         });
      });

      let manifest: SDK.PluginManifest = {
         name: "Media Scan Events Logger Plugin",
         version: "1.0.0",
         description: "Logs media scan events to the console",
         author: null,
         website: null,
      };
      await connection
         .sendMessage("setPluginManifest", { manifest })
         .then((res) => {
            if (res.type === "error") {
               console.error("Failed to set manifest:", res);
            }
         });

      let configuration: SDK.PluginConfiguration = {
         logEmptyObjects: {
            name: "Log Empty Scans",
            type: "boolean",
            value: false,
         },
      };
      await connection
         .sendMessage("setPluginConfiguration", { configuration })
         .then((res) => {
            if (res.type === "error") {
               console.error("Failed to set configuration:", res);
            }
         });

      connection.on("message", "configurationChange", (payload) => {
         configuration = payload.configuration;
      });

      const intents: SDK.PluginIntent[] = ["readMediaProcesses"];

      const { intents: grantedIntents } = await connection
         .sendMessage("getPluginIntents", {})
         .then((res) => {
            if (res.type === "error") {
               throw new Error(`Failed to get intents: ${res.message}`);
            }
            return res;
         });

      if (!intents.every((intent) => grantedIntents.includes(intent))) {
         await connection
            .sendMessage("requestPluginIntents", { intents })
            .then((res) => {
               if (res.type === "error") {
                  console.error("Failed to request intents:", res);
               }
            });

         await new Promise<void>((resolve) => {
            connection.on(
               "message",
               "intentsGrant",
               function listener({ intents: grantedIntents }) {
                  if (
                     intents.every((intent) => grantedIntents.includes(intent))
                  ) {
                     connection.off("message", "intentsGrant", listener);
                     resolve();
                  }
               }
            );
         });
      }

      await connection
         .sendMessage("subscribeToStaticMediaScans", {})
         .then((res) => {
            if (res.type === "error") {
               console.error("Failed to subscribe to static media scans:", res);
            }
         });

      connection.on("message", "staticMediaScan", ({ objects }) => {
         const isLogEmpty = Boolean(configuration.logEmptyObjects?.value);
         if (!isLogEmpty && objects.length === 0) return;
         console.log(`Scan event: ${objects.length} object(s) detected`);
         for (const obj of objects) {
            console.log(
               `  label=${obj.label} score=${obj.score.toFixed(3)} at (${obj.rect.x.toFixed(3)}, ${obj.rect.y.toFixed(3)}) ${obj.rect.width.toFixed(3)}x${obj.rect.height.toFixed(3)}`
            );
         }
      });
   });
});
