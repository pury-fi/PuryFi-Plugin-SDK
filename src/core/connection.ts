import { decode, encode } from "@msgpack/msgpack";
import {
   ExtractByTypeArgument,
   IncomingMessage,
   IncomingMessageObject,
   OutgoingMessage,
   PayloadArgument,
   Return,
   TypeArgument,
} from "./message.js";
import {
   compareVersions,
   maxApiVersion,
   minApiVersion,
   parseVersion,
} from "./upstream-connection.js";
import { isNumber, isObject, isUndefined } from "./type-util.js";
import { ReadOnlyPath, ReadOnlyValue } from "./state.js";

export type ConnectionMessageEvent<T extends TypeArgument<IncomingMessage>> = {
   type: T;
   payload: PayloadArgument<ExtractByTypeArgument<IncomingMessage, T>>;
   currentResponse:
      | Return<ExtractByTypeArgument<IncomingMessage, T>>
      | undefined;
};
export type AnyConnectionMessageEvent = {
   [K in TypeArgument<IncomingMessage>]: ConnectionMessageEvent<K>;
}[TypeArgument<IncomingMessage>];

export type ConnectionEvents = {
   message: (event: AnyConnectionMessageEvent) => any;
   error: (error: ConnectionError) => void;
   open: () => void;
   close: () => void;
};

export type TypedConnectionMessageEventListener<T> = (
   payload: PayloadArgument<T>,
   currentResponse: undefined | Return<T>
) => Return<T> | Promise<Return<T>>;

export abstract class Connection {
   private messageListeners: {
      [K in TypeArgument<IncomingMessage>]?: Set<
         TypedConnectionMessageEventListener<
            ExtractByTypeArgument<IncomingMessage, K>
         >
      >;
   } = {};
   private onceMessageListeners: {
      [K in TypeArgument<IncomingMessage>]?: Set<
         TypedConnectionMessageEventListener<
            ExtractByTypeArgument<IncomingMessage, K>
         >
      >;
   } = {};
   private listeners: {
      [K in keyof ConnectionEvents]?: Set<ConnectionEvents[K]>;
   } = {};
   private onceListeners: {
      [K in keyof ConnectionEvents]?: Set<ConnectionEvents[K]>;
   } = {};
   private responseListeners: {
      [K in number]?: [
         (response: any) => void,
         (error: ConnectionError) => void,
      ];
   } = {};
   private nextResponseId = 0;
   private debug: boolean = false;

   abstract send(data: ArrayBuffer | string): void;

   encodeMessage(message: any): ArrayBuffer {
      const encodedMessage = encode(message);

      const encodedMessageSlice = encodedMessage.buffer.slice(
         encodedMessage.byteOffset,
         encodedMessage.byteOffset + encodedMessage.byteLength
      );
      return encodedMessageSlice;
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
      listener: TypedConnectionMessageEventListener<
         ExtractByTypeArgument<IncomingMessage, T>
      >
   ): void;
   on<K extends keyof ConnectionEvents>(
      event: K,
      listener: ConnectionEvents[K]
   ): void;
   on<
      K extends keyof ConnectionEvents,
      T extends TypeArgument<IncomingMessage>,
   >(
      ...args:
         | [
              event: "message",
              type: T,
              listener: TypedConnectionMessageEventListener<
                 ExtractByTypeArgument<IncomingMessage, T>
              >,
           ]
         | [event: K, listener: ConnectionEvents[K]]
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
      listener: TypedConnectionMessageEventListener<
         ExtractByTypeArgument<IncomingMessage, T>
      >
   ): void;
   once<K extends keyof ConnectionEvents>(
      event: K,
      listener: ConnectionEvents[K]
   ): void;
   once<
      K extends keyof ConnectionEvents,
      T extends TypeArgument<IncomingMessage>,
   >(
      ...args:
         | [
              event: "message",
              type: T,
              listener: TypedConnectionMessageEventListener<
                 ExtractByTypeArgument<IncomingMessage, T>
              >,
           ]
         | [event: K, listener: ConnectionEvents[K]]
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
      listener: TypedConnectionMessageEventListener<
         ExtractByTypeArgument<IncomingMessage, T>
      >
   ): void;
   off<K extends keyof ConnectionEvents>(
      event: K,
      listener: ConnectionEvents[K]
   ): void;
   off<
      K extends keyof ConnectionEvents,
      T extends TypeArgument<IncomingMessage>,
   >(
      ...args:
         | [
              event: "message",
              type: T,
              listener: TypedConnectionMessageEventListener<
                 ExtractByTypeArgument<IncomingMessage, T>
              >,
           ]
         | [event: K, listener: ConnectionEvents[K]]
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
   ): Promise<
      | {
           type: "ok";
           value: ReadOnlyValue<P>;
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "unavailablePath";
           message: string;
        }
   >;
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

         const encodedMessage = this.encodeMessage({
            type,
            payload,
            responseId,
         });
         this.send(encodedMessage);

         this.responseListeners[responseId] = [resolve, reject];
      });
   }

   handleReadyMessage(
      payload: Readonly<
         PayloadArgument<ExtractByTypeArgument<IncomingMessage, "ready">>
      >
   ): Return<ExtractByTypeArgument<IncomingMessage, "ready">> {
      const parsedApiVersion = parseVersion(payload.apiVersion, 3)!;
      if (
         compareVersions(parsedApiVersion, minApiVersion) < 0 ||
         0 <= compareVersions(parsedApiVersion, maxApiVersion)
      ) {
         return {
            type: "error",
            name: "incompatibleApiVersion",
            message: "Not compatible with the offered plugin API version",
         };
      }

      return {
         type: "ok",
      };
   }

   private emit<K extends keyof Exclude<ConnectionEvents, "message">>(
      event: K,
      ...args: Parameters<ConnectionEvents[K]>
   ): undefined {
      this.onceListeners[event]?.forEach((listener) =>
         // @ts-ignore
         listener(...args)
      );
      delete this.onceListeners[event];
      this.listeners[event]?.forEach((listener) =>
         // @ts-ignore
         listener(...args)
      );
   }

   // TODO: Narrow return type
   private emitMessage(message: IncomingMessageObject): any {
      let currentResponse: any = undefined;
      this.onceMessageListeners[message.type]?.forEach(
         (listener) =>
            // @ts-ignore
            (currentResponse = listener(message.payload, currentResponse))
      );
      delete this.onceMessageListeners[message.type];
      this.messageListeners[message.type]?.forEach(
         (listener) =>
            // @ts-ignore
            (currentResponse = listener(message.payload, currentResponse))
      );

      this.onceListeners["message"]?.forEach(
         (listener) =>
            // @ts-ignore
            (currentResponse = listener({
               type: message.type,
               payload: message.payload,
               currentResponse,
            }))
      );
      delete this.onceListeners["message"];
      this.listeners["message"]?.forEach(
         (listener) =>
            // @ts-ignore
            (currentResponse = listener({
               type: message.type,
               payload: message.payload,
               currentResponse,
            }))
      );

      return currentResponse;
   }

   protected log(...args: any[]) {
      if (this.debug) {
         console.log("[PuryFi SDK]", ...args);
      }
   }

   protected handleMessage(payload: any) {
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
               new ConnectionError(
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

         responseCallback[0](message.payload);

         delete this.responseListeners[message.responseId];
      } else {
         // TODO: Validate message type and payload

         const isExpectingResponse = message.responseId != null;

         let response;
         try {
            response = this.emitMessage(message as any);
         } catch (error) {
            this.emit(
               "error",
               new ConnectionError(
                  "ClientError",
                  "Error while handling message"
               )
            );
            return;
         }

         if (isExpectingResponse && response !== undefined) {
            const encodedMessage = this.encodeMessage({
               payload: response,
               responseId: message.responseId,
            });
            this.send(encodedMessage);
         }
      }
   }

   /**
    * Handles an upstream connection open event.
    * @param event The open event
    */
   protected handleOpen() {
      this.log("Upstream connection open");
      this.emit("open");
   }

   /**
    * Handles an upstream connection close event.
    */
   protected handleClose() {
      this.log("Upstream connection closed");
      this.emit("close");
   }

   /**
    * Handles an error event from upstream connection.
    * @param error The error
    */
   protected handleError(error: ConnectionError) {
      this.log("Upstream connection error:", error);
      this.emit("error", error);
   }
}

export class ConnectionError extends Error {
   constructor(
      public name: "ResponseError" | "SocketError" | "ClientError",
      message: string,
      public requestId?: number
   ) {
      super(message);
   }
}
