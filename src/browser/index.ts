import { PuryFiConnectionError } from "../core/puryfi.js";
import {
   PuryFiUpstream,
   validateHandshakeParameters,
} from "../core/upstream.js";

export const extension = globalThis.browser ?? globalThis.chrome;

interface BroadcastMessage {
   type: "SEND_TO_PURYFI" | "MESSAGE_FROM_PURYFI" | "CLOSE" | "ERROR" | "OPEN";
   data: ArrayBuffer | string;
}

function isChromiumExtension(): boolean {
   return chrome.runtime.getManifest().manifest_version === 3;
}

export default class PuryFiBrowser extends PuryFiUpstream {
   private upstream: BroadcastChannel | browser.runtime.Port | null = null;

   constructor() {
      super();
      if (isChromiumExtension()) {
         this.upstream = new BroadcastChannel("puryfi-binary-bus");
         this.upstream?.postMessage({ type: "CLOSE" });
         let initialized = false;
         let intervalId = setInterval(() => {
            if (!initialized) {
               this.log("Posting OPEN message to BroadcastChannel");
               this.upstream?.postMessage({ type: "OPEN" });
            } else {
               this.log(
                  "Connection initialized, clearing OPEN message interval"
               );
               clearInterval(intervalId);
            }
         }, 1000);
         this.upstream.onmessage = (event) => {
            let data = event.data as BroadcastMessage;
            if (!initialized) {
               if (data.type === "OPEN") {
                  const payload = data.data as string;
                  const [version, apiVersion] = payload.split("|");
                  const result = validateHandshakeParameters(
                     version,
                     apiVersion
                  );
                  if (!result.success) {
                     this.log(
                        "Rejected client during handshake on BroadcastChannel",
                        result.reason
                     );
                     return;
                  }
                  initialized = true;
                  this.emit("open", {
                     version,
                     apiVersion,
                  });
               }
            } else {
               if (data.type === "MESSAGE_FROM_PURYFI") {
                  this.emit("message", data.data as ArrayBuffer);
               } else if (data.type === "CLOSE") {
                  this.emit("close");
               } else if (data.type === "ERROR") {
                  this.emit(
                     "error",
                     new PuryFiConnectionError(
                        "SocketError",
                        data.data as string
                     )
                  );
               }
            }
         };
      } else {
         extension.runtime.onConnect.addListener((port) => {
            if (port.name.startsWith("puryfi-plugin-initiator")) {
               let version = port.name.split("/")[1];
               let apiVersion = port.name.split("/")[2];

               const result = validateHandshakeParameters(version, apiVersion);
               if (!result.success) {
                  this.log(
                     "Rejected client during handshake on port",
                     port,
                     result.reason
                  );
                  port.disconnect();
                  return;
               }

               this.upstream = port;
               this.upstream.onMessage.addListener((message) => {
                  let tmpRaw = message as Record<string, unknown>;
                  if (tmpRaw.data instanceof ArrayBuffer) {
                     this.emit("message", tmpRaw.data);
                  }
               });
               this.upstream.onDisconnect.addListener(() => {
                  this.emit("close");
               });

               this.emit("open", {
                  version,
                  apiVersion,
               });
            }
         });
      }
   }

   send(data: ArrayBuffer | string): void {
      try {
         if (this.upstream instanceof BroadcastChannel) {
            this.upstream.postMessage({ type: "SEND_TO_PURYFI", data });
         } else if (this.upstream) {
            this.upstream.postMessage({ data });
         } else {
            throw new PuryFiConnectionError(
               "SocketError",
               "No upstream connection available"
            );
         }
      } catch (error) {
         if (error instanceof DOMException) {
            if (error.name === "InvalidStateError") {
               throw new PuryFiConnectionError(
                  "SocketError",
                  "Socket connection already closed"
               );
            } else if (error.name === "DataCloneError") {
               throw new PuryFiConnectionError(
                  "SocketError",
                  "Data could not be serialized"
               );
            }
         } else {
            throw error;
         }
      }
   }
}
