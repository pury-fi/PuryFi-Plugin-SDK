import { decode, encode } from "@msgpack/msgpack";
import {
   ExtractByTypeArgument,
   IncomingMessage,
   IncomingMessageObject,
   OutgoingMessage,
   PayloadArgument,
   Return,
   TypeArgument,
} from "./messages.js";
import { PuryFiUpstream } from "./upstream.js";
import { isNumber, isObject, isUndefined } from "./type-util.js";
import { ReadOnlyPath, ReadOnlyValue } from "./index.js";

type Events = {
   message: (message: IncomingMessageObject) => void;
   error: (error: PuryFiError) => void;
   open: () => void;
   close: () => void;
};

export type Listener<T> = (payload: PayloadArgument<T>) => Promise<Return<T>>;

export class PuryFiConnection {
   private messageListeners: {
      [K in TypeArgument<IncomingMessage>]?: Set<
         Listener<ExtractByTypeArgument<IncomingMessage, K>>
      >;
   } = {};
   private onceMessageListeners: {
      [K in TypeArgument<IncomingMessage>]?: Set<
         Listener<ExtractByTypeArgument<IncomingMessage, K>>
      >;
   } = {};
   private listeners: {
      [K in keyof Events]?: Set<Events[K]>;
   } = {};
   private onceListeners: {
      [K in keyof Events]?: Set<Events[K]>;
   } = {};
   private responseListeners: {
      [K in number]?: [(response: any) => void, (error: PuryFiError) => void];
   } = {};
   private nextResponseId = 0;
   private debug: boolean = false;

   /**
    * Create a new PuryFi SDK instance.
    * @param upstream The upstream connection (WebSocket/Port)
    * @param manifest Plugin manifest
    * @param configuration Custom configuration fields to display in the PuryFi UI
    */
   constructor(public upstream: PuryFiUpstream) {
      upstream.on("message", (data) => this.handleMessage(data));
      upstream.on("error", (error) => this.handleError(error));
      upstream.on("open", () => this.handleOpen());
      upstream.on("close", () => this.handleClose());
   }

   on<T extends TypeArgument<IncomingMessage>>(
      event: "message",
      type: T,
      listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>
   ): void;
   on<K extends keyof Events>(event: K, listener: Events[K]): void;
   on<K extends keyof Events, T extends TypeArgument<IncomingMessage>>(
      ...args:
         | [
              event: "message",
              type: T,
              listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>,
           ]
         | [event: K, listener: Events[K]]
   ): void {
      if (
         args[0] === "message" &&
         typeof args[1] === "string" &&
         typeof args[2] === "function"
      ) {
         const [, type, listener] = args;
         if (this.messageListeners[type] === undefined) {
            // @ts-ignore
            this.messageListeners[type] = new Set();
         }
         this.messageListeners[type].add(listener);
      } else if (typeof args[0] === "string" && typeof args[1] === "function") {
         const [event, listener] = args;
         if (this.listeners[event] === undefined) {
            // @ts-ignore
            this.listeners[event] = new Set();
         }
         // @ts-ignore
         this.listeners[event].add(listener);
      }
   }

   once<T extends TypeArgument<IncomingMessage>>(
      event: "message",
      type: T,
      listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>
   ): void;
   once<K extends keyof Events>(event: K, listener: Events[K]): void;
   once<K extends keyof Events, T extends TypeArgument<IncomingMessage>>(
      ...args:
         | [
              event: "message",
              type: T,
              listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>,
           ]
         | [event: K, listener: Events[K]]
   ): void {
      if (
         args[0] === "message" &&
         typeof args[1] === "string" &&
         typeof args[2] === "function"
      ) {
         const [, type, listener] = args;
         if (this.onceMessageListeners[type] === undefined) {
            // @ts-ignore
            this.onceMessageListeners[type] = new Set();
         }
         this.onceMessageListeners[type].add(listener);
      } else if (typeof args[0] === "string" && typeof args[1] === "function") {
         const [event, listener] = args;
         if (this.onceListeners[event] === undefined) {
            // @ts-ignore
            this.onceListeners[event] = new Set();
         }
         // @ts-ignore
         this.onceListeners[event].add(listener);
      }
   }

   off<T extends TypeArgument<IncomingMessage>>(
      event: "message",
      type: T,
      listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>
   ): void;
   off<K extends keyof Events>(event: K, listener: Events[K]): void;
   off<K extends keyof Events, T extends TypeArgument<IncomingMessage>>(
      ...args:
         | [
              event: "message",
              type: T,
              listener: Listener<ExtractByTypeArgument<IncomingMessage, T>>,
           ]
         | [event: K, listener: Events[K]]
   ): void {
      if (
         args[0] === "message" &&
         typeof args[1] === "string" &&
         typeof args[2] === "function"
      ) {
         const [, type, listener] = args;
         this.messageListeners[type]?.delete(listener);
         this.onceMessageListeners[type]?.delete(listener);
      } else if (typeof args[0] === "string" && typeof args[1] === "function") {
         const [event, listener] = args;
         // @ts-ignore
         this.listeners[event]?.delete(listener);
         // @ts-ignore
         this.onceListeners[event]?.delete(listener);
      }
   }

   private emit<K extends keyof Events>(
      event: K,
      ...args: Parameters<Events[K]>
   ): void {
      this.onceListeners[event]?.forEach((listener) => {
         // @ts-ignore
         listener(...args);
      });
      delete this.onceListeners[event];
      this.listeners[event]?.forEach((listener) =>
         // @ts-ignore
         listener(...args)
      );
   }

   private emitMessage(message: IncomingMessageObject): void {
      this.emit("message", message);
      this.onceMessageListeners[message.type]?.forEach((listener) =>
         // @ts-ignore
         listener(message.payload)
      );
      delete this.onceMessageListeners[message.type];
      this.messageListeners[message.type]?.forEach((listener) =>
         // @ts-ignore
         listener(message.payload)
      );
   }

   // TODO: Handle transferables

   // TODO: Document

   /**
    *
    * @param type The type of message to be sent to PuryFi
    * @param payload The message payload for the specific message type
    * @param transfer Binary transferable
    * @returns
    * @throws PuryFiError
    */
   async sendMessage<T extends "getState", P extends ReadOnlyPath>(
      type: T,
      payload: { path: P },
      transfer?: Transferable[]
   ): Promise<{ value: ReadOnlyValue<P> }>;
   async sendMessage<
      T extends Exclude<TypeArgument<OutgoingMessage>, "getState">,
   >(
      type: T,
      payload: PayloadArgument<ExtractByTypeArgument<OutgoingMessage, T>>,
      transfer?: Transferable[]
   ): Promise<Return<ExtractByTypeArgument<OutgoingMessage, T>>>;
   async sendMessage<T extends TypeArgument<OutgoingMessage>>(
      type: T,
      payload: PayloadArgument<ExtractByTypeArgument<OutgoingMessage, T>>,
      transfer: Transferable[] = []
   ): Promise<Return<ExtractByTypeArgument<OutgoingMessage, T>>> {
      return await new Promise<
         Return<ExtractByTypeArgument<OutgoingMessage, T>>
      >((resolve, reject) => {
         const responseId = this.nextResponseId;
         this.nextResponseId++;

         const encodedMessage = encode({ type, payload, responseId });

         const encodedMessageSlice = encodedMessage.buffer.slice(
            encodedMessage.byteOffset,
            encodedMessage.byteOffset + encodedMessage.byteLength
         );

         this.upstream.send(encodedMessageSlice);

         this.responseListeners[responseId] = [resolve, reject];
      });
   }

   /**
    * Enable or disable debug logging.
    * @param enabled debug state
    */
   setDebug(enabled: boolean) {
      this.debug = enabled;
   }

   private log(...args: any[]) {
      if (this.debug) {
         console.log("[PuryFi SDK]", ...args);
      }
   }

   /**
    * Handle incoming message from upstream connection.
    * @param payload The raw payload data
    */
   private handleMessage(payload: any) {
      let message = decode(payload);

      if (!isObject(message)) {
         // TODO: Log error

         return;
      }

      if (isUndefined(message.type)) {
         if (!isNumber(message.responseId)) {
            // TODO: Log error

            return;
         }

         let responseCallback = this.responseListeners[message.responseId];
         if (responseCallback === undefined) {
            this.emit(
               "error",
               new PuryFiError(
                  "ClientError",
                  "Response for unknown request received",
                  message.responseId
               )
            );
            this.log(
               "No response hook found for message ID:",
               message.responseId
            );
            return;
         }

         if (!isUndefined(message.error)) {
            responseCallback[1](
               new PuryFiError(
                  "ResponseError",
                  message.error as string,
                  message.responseId
               )
            );
         }

         responseCallback[0](message.payload);

         delete this.responseListeners[message.responseId];
      } else {
         // TODO: Validate message type and payload

         this.emitMessage(message as any);
      }
   }

   /**
    * Handle upstream connection open event.
    */
   private handleOpen() {
      this.log("Upstream connection open");
      this.emit("open");
   }

   /**
    * Handle upstream connection close event.
    */
   private handleClose() {
      this.log("Upstream connection closed");
      this.emit("close");
   }

   /**
    * Handle error event from upstream connection.
    * @param error Error message
    */
   private handleError(error: PuryFiError) {
      this.log("Upstream connection error:", error);
      this.emit("error", error);
   }
}

export class PuryFiError extends Error {
   constructor(
      public name: "ResponseError" | "SocketError" | "ClientError",
      message: string,
      public requestId?: number
   ) {
      super(message);
   }
}
