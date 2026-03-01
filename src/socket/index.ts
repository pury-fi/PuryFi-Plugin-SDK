import WebSocket, { PerMessageDeflateOptions, WebSocketServer } from "ws";
import {
   PuryFiUpstream,
   validateHandshakeParameters,
} from "../core/upstream.js";
import { PuryFiConnectionError } from "../core/index.js";

// TODO: Handle multiple clients attempting to connect

// TODO: Implement receiving and validating a version and API version from the browser upstream as well

export default class PuryFiSocket extends PuryFiUpstream {
   private socketServer: WebSocketServer;
   private clients: WebSocket[] = [];

   send(data: ArrayBuffer | string): void {
      this.clients.forEach((client) => {
         if (client.readyState === WebSocket.OPEN) {
            client.send(data);
         } else {
            throw new PuryFiConnectionError(
               "SocketError",
               "Message sent before connection was established"
            );
         }
      });
   }

   constructor(
      port: number,
      options: {
         maxPayload?: number | undefined;
         perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
      } = {}
   ) {
      options = {
         maxPayload: 128 * 1024 * 1024, // 128MB
         perMessageDeflate: false,
         ...options,
      };

      super();
      this.socketServer = new WebSocketServer({
         port,
         ...options,
      });
      this.socketServer.on("listening", () => {
         this.log("PuryFiSocket listening on port", port);
      });
      this.socketServer.on("error", (err: Error) => {
         this.log("PuryFiSocket error on port", port, err.message);
         this.emit(
            "error",
            new PuryFiConnectionError("SocketError", err.message)
         );
      });
      this.socketServer.on("connection", (ws: WebSocket, request) => {
         this.log("New client connected to PuryFiSocket on port", port);

         const requestUrl = new URL(
            request.url ?? "/",
            `ws://localhost:${port}`
         );
         const version = requestUrl.searchParams.get("version");
         const apiVersion = requestUrl.searchParams.get("apiVersion");

         try {
            const result = validateHandshakeParameters(version, apiVersion);
            if (!result.success) {
               this.log(
                  "Rejected new client during handshake on port",
                  port,
                  result.reason
               );
               ws.close(4000, result.reason);
               return;
            }
         } catch (e) {
            const reason =
               "internalError: An internal error occurred while validating the version and API version";
            this.log(
               "Rejected new client during handshake on port",
               port,
               reason
            );
            ws.close(4000, reason);
            return;
         }

         ws.binaryType = "arraybuffer";
         this.clients.push(ws);

         ws.on("message", (data: WebSocket.Data) => {
            this.log(
               "Received message from client on PuryFiSocket on port",
               port
            );
            let binaryData = data as ArrayBuffer;
            this.emit("message", binaryData);
         });
         ws.on("close", () => {
            this.log("Client disconnected from PuryFiSocket on port", port);
            this.clients.splice(this.clients.indexOf(ws), 1);
            this.emit("close");
         });
         ws.on("error", (err: Error) => {
            this.log("Client error on PuryFiSocket on port", port, err.message);
            this.emit(
               "error",
               new PuryFiConnectionError("SocketError", err.message)
            );
         });

         this.emit("open", {
            version: version!,
            apiVersion: apiVersion!,
         });
      });
   }
}
