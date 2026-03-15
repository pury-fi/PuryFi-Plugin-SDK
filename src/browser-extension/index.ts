export * from "../core/index.js";

import { Connection, ConnectionError } from "../core/connection.js";

const extension = globalThis.browser ?? globalThis.chrome;

const HEARTBEAT_TIMEOUT_MS = 5000;

interface BroadcastMessage {
   type:
      | "SEND_TO_PURYFI"
      | "MESSAGE_FROM_PURYFI"
      | "CLOSE"
      | "ERROR"
      | "OPEN"
      | "HEARTBEAT";
   data?: ArrayBuffer | string;
   sessionId?: string;
}

function isChromiumExtension(): boolean {
   // browser.runtime.getBrowserInfo is a Firefox-exclusive API, so we check for its presence to determine if we're running in a Chromium-based extension environment
   return !(typeof globalThis.browser?.runtime?.getBrowserInfo === "function");
}

export class BrowserExtensionConnection extends Connection {
   private upstream: BroadcastChannel | browser.runtime.Port | null = null;

   constructor() {
      super();

      if (isChromiumExtension()) {
         let upstream: BroadcastChannel | browser.runtime.Port | null = null;
         let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
         let sessionId: string | null = null;

         upstream = new BroadcastChannel("puryfi-binary-bus");
         upstream.postMessage({ type: "CLOSE" });
         let initialized = false;
         let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;

         const resetHeartbeatWatchdog = () => {
            if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
            heartbeatWatchdog = setTimeout(() => {
               heartbeatWatchdog = null;
               if (upstream instanceof BroadcastChannel) {
                  upstream.onmessage = null;
                  upstream.postMessage({ type: "CLOSE" });
               }
               clearInterval(heartbeatIntervalId!);
               this.handleClose();
            }, HEARTBEAT_TIMEOUT_MS);
         };

         let intervalId = setInterval(() => {
            if (!initialized) {
               this.log("Posting OPEN message to BroadcastChannel");
               upstream?.postMessage({ type: "OPEN" });
            } else {
               this.log(
                  "Connection initialized, clearing OPEN message interval"
               );
               clearInterval(intervalId);
            }
         }, 1000);

         upstream.onmessage = (event) => {
            let data = event.data as BroadcastMessage;
            if (!initialized) {
               if (data.type === "OPEN") {
                  heartbeatIntervalId = setInterval(() => {
                     const ping = new ArrayBuffer(1);
                     new Uint8Array(ping)[0] = 0x09;
                     this.send(ping);
                  }, 2000);
                  sessionId = data.sessionId ?? null;
                  initialized = true;
                  resetHeartbeatWatchdog();
                  this.handleOpen();
               }
            } else {
               if (data.type === "OPEN") {
                  if (data.sessionId !== sessionId) {
                     if (heartbeatWatchdog) {
                        clearTimeout(heartbeatWatchdog);
                        heartbeatWatchdog = null;
                     }
                     upstream.onmessage = null;
                     clearInterval(heartbeatIntervalId!);
                     clearInterval(intervalId);
                     this.handleClose();
                  }
               } else if (data.type === "MESSAGE_FROM_PURYFI") {
                  this.handleMessage(data.data as ArrayBuffer);
               } else if (data.type === "HEARTBEAT") {
                  resetHeartbeatWatchdog();
               } else if (data.type === "CLOSE") {
                  console.warn(
                     "Received CLOSE message from BroadcastChannel, closing connection"
                  );
                  if (heartbeatWatchdog) {
                     clearTimeout(heartbeatWatchdog);
                     heartbeatWatchdog = null;
                  }
                  upstream.onmessage = null;
                  clearInterval(heartbeatIntervalId!);
                  clearInterval(intervalId);
                  this.handleClose();
               } else if (data.type === "ERROR") {
                  this.handleError(
                     new ConnectionError("SocketError", data.data as string)
                  );
               }
            }
         };

         this.upstream = upstream;
      } else {
         let upstream: browser.runtime.Port | null = null;
         let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

         extension.runtime.onConnect.addListener((port) => {
            if (port.name === "puryfi-plugin-initiator") {
               upstream = port;
               upstream.onMessage.addListener((message) => {
                  let tmpRaw = message as Record<string, unknown>;
                  if (tmpRaw.data instanceof ArrayBuffer) {
                     this.handleMessage(tmpRaw.data);
                  }
               });
               upstream.onDisconnect.addListener(() => {
                  clearInterval(heartbeatIntervalId!);
                  this.handleClose();
               });

               this.handleOpen();
            }
         });

         this.upstream = upstream;
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
