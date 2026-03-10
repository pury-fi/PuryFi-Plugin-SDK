import { ConnectionError } from "../core/connection.js";
import { UpstreamConnection } from "../core/upstream-connection.js";

const extension = globalThis.browser ?? globalThis.chrome;

interface BroadcastMessage {
   type: "SEND_TO_PURYFI" | "MESSAGE_FROM_PURYFI" | "CLOSE" | "ERROR" | "OPEN";
   data: ArrayBuffer | string;
}

function isChromiumExtension(): boolean {
   return chrome.runtime.getManifest().manifest_version === 3;
}

export default class BrowserExtensionConnection extends UpstreamConnection {
   private upstream: BroadcastChannel | browser.runtime.Port | null = null;

   constructor() {
      super();
      if (isChromiumExtension()) {
         this.upstream = new BroadcastChannel("puryfi-binary-bus");
         this.upstream.postMessage({ type: "CLOSE" });
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
                  setInterval(() => {
                     const ping = new ArrayBuffer(1);
                     new Uint8Array(ping)[0] = 0x09;
                     this.send(ping);
                  }, 2000);
                  initialized = true;
                  this.emit("open");
               }
            } else {
               if (data.type === "MESSAGE_FROM_PURYFI") {
                  this.emit("message", data.data as ArrayBuffer);
               } else if (data.type === "CLOSE") {
                  this.emit("close");
               } else if (data.type === "ERROR") {
                  this.emit(
                     "error",
                     new ConnectionError("SocketError", data.data as string)
                  );
               }
            }
         };
      } else { 
         extension.runtime.onConnect.addListener((port) => {
            if (port.name === "puryfi-plugin-initiator") {
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

               this.emit("open");
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
            throw new ConnectionError(
               "SocketError",
               "No upstream connection available"
            );
         }
      } catch (error) {
         if (error instanceof DOMException) {
            if (error.name === "InvalidStateError") {
               throw new ConnectionError(
                  "SocketError",
                  "Socket connection already closed"
               );
            } else if (error.name === "DataCloneError") {
               throw new ConnectionError(
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
