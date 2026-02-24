import WebSocket, { PerMessageDeflateOptions, WebSocketServer } from "ws";
import { PuryFiUpstream } from "../core/upstream.js";
import { PuryFiConnectionError } from "../core/index.js";

// TODO: Handle multiple clients attempting to connect

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
      port: number = 8080,
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
      this.socketServer = new WebSocketServer({ port, ...options });
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
      this.socketServer.on("connection", (ws: WebSocket) => {
         this.log("New client connected to PuryFiSocket on port", port);

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

         this.emit("open");
      });
   }
}
