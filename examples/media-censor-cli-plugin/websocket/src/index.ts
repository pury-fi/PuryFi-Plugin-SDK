import * as SDK from "@pury-fi/plugin-sdk/websocket";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const VALID_IMAGE_EXTENSIONS = new Set([
   ".png",
   ".jpg",
   ".jpeg",
   ".bmp",
   ".webp",
   ".avif",
   ".gif",
]);

const inputFolder = process.argv[2];
const outputFolder = process.argv[3];

if (!inputFolder || !outputFolder) {
   console.error("Usage: node dist/index.js <input-folder> <output-folder>");
   process.exit(1);
}

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
         name: "Media Censor CLI Plugin",
         version: "1.0.0",
         description:
            "Censors all images in a folder and writes the results to another folder",
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

      const intents: SDK.PluginIntent[] = ["requestMediaProcesses"];

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

      await fs.mkdir(outputFolder, { recursive: true });

      const entries = await fs.readdir(inputFolder);
      const imageFiles = entries.filter((entry) =>
         VALID_IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase())
      );

      console.log(
         `Censoring ${imageFiles.length} image(s) in '${inputFolder}' folder`
      );

      for (const filename of imageFiles) {
         const inputPath = path.join(inputFolder, filename);
         const outputPath = path.join(outputFolder, filename);

         const imageData = await fs.readFile(inputPath);

         const res = await connection.sendMessage("censorStaticMedia", {
            image: imageData,
            objects: null,
         });

         if (res.type === "error") {
            console.error(`Failed to censor ${filename}:`, res);
            continue;
         }

         await fs.writeFile(outputPath, res.image);
         console.log(`Censored ${filename} and saved to ${outputPath}`);
      }

      console.log("Done censoring images");
      process.exit(0);
   });
});
