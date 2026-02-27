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

export type OpenEvent = {
   version: string;
   apiVersion: string;
};

type Events = {
   message: (message: IncomingMessageObject) => void;
   error: (error: PuryFiConnectionError) => void;
   open: (event: OpenEvent) => void;
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
      [K in number]?: [
         (response: any) => void,
         (error: PuryFiConnectionError) => void,
      ];
   } = {};
   private nextResponseId = 0;
   private debug: boolean = false;

   /**
    * Creates a new connection to PuryFi.
    * @param upstream The upstream connection
    */
   constructor(public upstream: PuryFiUpstream) {
      upstream.on("message", (data) => this.handleMessage(data));
      upstream.on("error", (error) => this.handleError(error));
      upstream.on("open", (e) => this.handleOpen(e));
      upstream.on("close", () => this.handleClose());
   }

   /**
    * Enables or disables debug logging.
    * @param enabled Whether to enable or disable debug logging
    */
   setDebug(enabled: boolean) {
      this.debug = enabled;
   }

   /**
    * Registers an event listener. In case of listening for message events, you might optionally specify a message type to only listen for.
    * @param event The event type to listen for
    * @param type The message type to optionally only listen for in case of listening for message events
    * @param listener The callback to register
    */
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

   /**
    * Registers a one-time event listener. In case of listening for message events, you might optionally specify a message type to only listen for.
    * @param event The event type to listen for
    * @param type The message type to optionally only listen for in case of listening for message events
    * @param listener The callback to register
    */
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

   /**
    * Unregisters an event listener. In case of listening for message events, you might optionally specify a message type to only stop listening for.
    * @param event The event type to stop listening for
    * @param type The message type to optionally only stop listening for in case of listening for message events
    * @param listener The callback to unregister
    */
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

   /**
    * Sends a message.
    * @param type The message type to send
    * @param payload The message payload corresponding to the message type to send
    * @returns A promise that resolves with the response, or rejects with an error
    */
   async sendMessage<T extends "getState", P extends ReadOnlyPath>(
      type: T,
      payload: { path: P }
   ): Promise<{ value: ReadOnlyValue<P> }>;
   async sendMessage<
      T extends Exclude<TypeArgument<OutgoingMessage>, "getState">,
   >(
      type: T,
      payload: PayloadArgument<ExtractByTypeArgument<OutgoingMessage, T>>
   ): Promise<Return<ExtractByTypeArgument<OutgoingMessage, T>>>;
   async sendMessage<T extends TypeArgument<OutgoingMessage>>(
      type: T,
      payload: PayloadArgument<ExtractByTypeArgument<OutgoingMessage, T>>
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

   private log(...args: any[]) {
      if (this.debug) {
         console.log("[PuryFi SDK]", ...args);
      }
   }

   private handleMessage(payload: any) {
      // TODO: Catch errors here

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
               new PuryFiConnectionError(
                  "ClientError",
                  "Response for unknown request received",
                  message.responseId
               )
            );
            this.log(
               "No response listener found for message ID:",
               message.responseId
            );
            return;
         }

         if (!isUndefined(message.error)) {
            responseCallback[1](
               new PuryFiConnectionError(
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
    * Handles an upstream connection open event.
    * @param event The open event
    */
   private handleOpen(event: OpenEvent) {
      this.log("Upstream connection open");
      this.emit("open", event);
   }

   /**
    * Handles an upstream connection close event.
    */
   private handleClose() {
      this.log("Upstream connection closed");
      this.emit("close");
   }

   /**
    * Handles an error event from upstream connection.
    * @param error The error
    */
   private handleError(error: PuryFiConnectionError) {
      this.log("Upstream connection error:", error);
      this.emit("error", error);
   }
}

export class PuryFiConnectionError extends Error {
   constructor(
      public name: "ResponseError" | "SocketError" | "ClientError",
      message: string,
      public requestId?: number
   ) {
      super(message);
   }
}
