export * from "../core/index.js";

import * as ws from "ws";
import { Connection, ConnectionError } from "../core/index.js";

export type SocketEvents = {
   error: (error: ConnectionError) => void;
   connection: (connection: Connection) => void;
};

export class WebSocketServer {
   private socketServer: ws.WebSocketServer;
   private debug: boolean = false;
   protected listeners: { [K: string]: Set<(...args: any[]) => void> } = {};
   protected onceListeners: { [K: string]: Set<(...args: any[]) => void> } = {};

   private getSet<K extends keyof SocketEvents>(type: K): Set<SocketEvents[K]> {
      const existing = this.listeners[type];
      if (existing) return existing;

      const created = new Set<SocketEvents[K]>();
      // @ts-ignore yes typescript, I know what I'm doing
      this.listeners[type] = created;
      return created;
   }

   private getOnceSet<K extends keyof SocketEvents>(
      type: K
   ): Set<SocketEvents[K]> {
      const existing = this.onceListeners[type];
      if (existing) return existing;

      const created = new Set<SocketEvents[K]>();
      // @ts-ignore yes typescript, I know what I'm doing
      this.onceListeners[type] = created;
      return created;
   }

   /**
    * Register an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   addListener<K extends keyof SocketEvents>(
      type: K,
      callback: SocketEvents[K]
   ): this {
      this.getSet(type).add(callback);
      return this;
   }

   /**
    * Alias for addListener
    */
   on = this.addListener;

   /**
    * Register a one-time event listener. The callback is removed after it fires once.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   once<K extends keyof SocketEvents>(
      type: K,
      callback: SocketEvents[K]
   ): this {
      this.getOnceSet(type).add(callback);
      return this;
   }

   /**
    * Unregister an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   off<K extends keyof SocketEvents>(type: K, callback: SocketEvents[K]): this {
      this.listeners[type]?.delete(callback);
      return this;
   }

   /**
    * Emit an event.
    * @param type The event
    * @param args The event arguments
    */
   protected emit<K extends keyof SocketEvents>(
      type: K,
      ...args: Parameters<SocketEvents[K]>
   ): void {
      this.listeners[type]?.forEach((cb) => (cb as any)(...args));
      this.onceListeners[type]?.forEach((cb) => (cb as any)(...args));
      this.onceListeners[type]?.clear();
   }

   protected log(...args: any[]) {
      if (this.debug) {
         console.log("[PuryFi SDK]", ...args);
      }
   }

   setDebug(enabled: boolean) {
      this.debug = enabled;
   }

   constructor(
      port: number,
      options: {
         maxPayload?: number | undefined;
         perMessageDeflate?: boolean | ws.PerMessageDeflateOptions | undefined;
      } = {}
   ) {
      options = {
         maxPayload: 128 * 1024 * 1024, // 128MB
         perMessageDeflate: false,
         ...options,
      };

      this.socketServer = new ws.WebSocketServer({
         port,
         ...options,
      });
      this.socketServer.on("listening", () => {
         this.log("WebSocket server listening on port", port);
      });
      this.socketServer.on("error", (err: Error) => {
         this.log("WebSocket server error on port", port, err.message);
         this.emit("error", new ConnectionError("SocketError", err.message));
      });

      this.socketServer.on("connection", (ws: ws.WebSocket) => {
         this.log("New client connected to WebSocket connection on port", port);

         ws.binaryType = "arraybuffer";
         let instance = new WebSocketConnection(ws, this.debug);
         this.emit("connection", instance);
         instance.open();
      });
   }
}

export class WebSocketConnection extends Connection {
   private client: ws.WebSocket | null = null;

   send(data: ArrayBuffer | string): void {
      if (this.client) {
         this.client.send(data);
      }
   }

   open() {
      this.handleOpen();
   }

   constructor(ws: ws.WebSocket, debug: boolean = false) {
      super();
      this.setDebug(debug);

      ws.binaryType = "arraybuffer";
      this.client = ws;

      ws.on("message", (data: ws.RawData) => {
         this.log("Received message from client on WebSocket connection");
         let binaryData = data as ArrayBuffer;
         this.handleMessage(binaryData);
      });
      ws.on("close", () => {
         this.log("Client disconnected from WebSocket connection");
         this.client = null;
         this.handleClose();
      });
      ws.on("error", (err: Error) => {
         this.log("Client error on WebSocket connection", err.message);
         this.handleError(new ConnectionError("SocketError", err.message));
      });
   }
}
