import * as SDK from "@pury-fi/plugin-sdk/websocket";

function parseMinutes(time: string): number | null {
   const match = /^(\d{1,2}):(\d{2})$/.exec(time);
   if (!match) return null;
   const hours = parseInt(match[1]);
   const minutes = parseInt(match[2]);
   if (hours > 23 || minutes > 59) return null;
   return hours * 60 + minutes;
}

function shouldBeEnabled(configuration: SDK.PluginConfiguration): boolean {
   const enableMinutes = parseMinutes(
      String(configuration.enableTime?.value ?? "")
   );
   const disableMinutes = parseMinutes(
      String(configuration.disableTime?.value ?? "")
   );
   if (enableMinutes === null || disableMinutes === null) return false;
   const now = new Date();
   const nowMinutes = now.getHours() * 60 + now.getMinutes();
   if (enableMinutes < disableMinutes) {
      return nowMinutes >= enableMinutes && nowMinutes < disableMinutes;
   } else if (enableMinutes > disableMinutes) {
      return nowMinutes >= enableMinutes || nowMinutes < disableMinutes;
   }
   return false;
}

const server = new SDK.WebSocketServer(8080);

server.once("connection", (connection) => {
   connection.once("open", async () => {
      let areIntentsGranted = false;

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
         name: "Enable Scheduler Plugin",
         version: "1.0.0",
         description: "Enables and disables PuryFi on a daily schedule",
         author: null,
         website: null,
      };
      await connection
         .sendMessage("setPluginManifest", { manifest })
         .then((res) => {
            if (res.type === "error") {
               throw new Error(`Failed to set plugin manifest: ${res.message}`);
            }
         });

      let configuration: SDK.PluginConfiguration = {
         enableTime: {
            name: "Enable Time",
            type: "string",
            value: "08:00",
         },
         disableTime: {
            name: "Disable Time",
            type: "string",
            value: "22:00",
         },
      };
      await connection
         .sendMessage("setPluginConfiguration", { configuration })
         .then((res) => {
            if (res.type === "error") {
               throw new Error(
                  `Failed to set plugin configuration: ${res.message}`
               );
            }
         });

      let schedulerInterval: ReturnType<typeof setInterval> | null = null;
      let schedulerTimeout: ReturnType<typeof setTimeout> | null = null;

      async function tick() {
         const enabled = shouldBeEnabled(configuration);
         await connection
            .sendMessage("setState", { path: "enabled", value: enabled })
            .then((res) => {
               if (res.type === "error") {
                  throw new Error(
                     `Failed to set enabled state: ${res.message}`
                  );
               }
            });
      }

      function startScheduler() {
         if (schedulerInterval !== null) clearInterval(schedulerInterval);
         if (schedulerTimeout !== null) clearTimeout(schedulerTimeout);
         tick();
         const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
         schedulerTimeout = setTimeout(() => {
            tick();
            schedulerInterval = setInterval(tick, 60_000);
         }, msUntilNextMinute);
      }

      connection.on("message", "configurationChange", (payload) => {
         configuration = payload.configuration;
         if (areIntentsGranted) {
            startScheduler();
         }
      });

      const intents: SDK.PluginIntent[] = ["writeEnabledState"];

      const { intents: grantedIntents } = await connection
         .sendMessage("getPluginIntents", {})
         .then((res) => {
            if (res.type === "error") {
               throw new Error(`Failed to get plugin intents: ${res.message}`);
            }
            return res;
         });

      if (!intents.every((intent) => grantedIntents.includes(intent))) {
         await connection
            .sendMessage("requestPluginIntents", { intents })
            .then((res) => {
               if (res.type === "error") {
                  throw new Error(
                     `Failed to request plugin intents: ${res.message}`
                  );
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

      areIntentsGranted = true;

      startScheduler();
   });
});
