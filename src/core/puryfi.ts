import { decode, encode } from "@msgpack/msgpack";
import { PluginConfiguration, PluginCustomConfiguration } from "./config.js";
import {
   BasicMessage,
   ConfigurationMessageField,
   generateConfigurationMessage,
} from "./messages.js";
import { PuryFiPluginActions } from "./actions.js";
import { PuryFiUpstream } from "./upstream.js";
import { QueriesResult, Query } from "./query.js";

type ClientEvents = {
   error: (error: string) => void;
   event: (event: BasicMessage) => void;
   config: (key: string, value: string | number | boolean) => void;
   close: () => void;
   ready: () => void;
};

function uuidv4() {
   return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
         +c ^
         (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
      ).toString(16)
   );
}

export class PuryFi {
   config: PluginConfiguration;
   customConfig: PluginCustomConfiguration;
   actions: PuryFiPluginActions;

   private upstream: PuryFiUpstream;
   private debug: boolean = false;
   private responseHooks: { [key: string]: (response: any) => void } = {};
   /**
    * Create a new PuryFi SDK instance.
    * @param upstream The upstream connection (WebSocket/Port)
    * @param config General Plugin Configuration
    * @param customConfig Custom Config fields to display in the PuryFi UI
    */
   constructor(
      upstream: PuryFiUpstream,
      config: PluginConfiguration,
      customConfig: PluginCustomConfiguration
   ) {
      this.upstream = upstream;
      this.customConfig = customConfig;
      this.config = config;
      this.actions = new PuryFiPluginActions(this);
      upstream.on("message", (data) => this.handleMessage(data));
      upstream.on("close", () => this.handleClose());
      upstream.on("error", (error) => this.handleError(error));
   }

   private listeners: { [K in keyof ClientEvents]?: Set<ClientEvents[K]> } = {};

   private getSet<K extends keyof ClientEvents>(type: K): Set<ClientEvents[K]> {
      const existing = this.listeners[type];
      if (existing) return existing;

      const created = new Set<ClientEvents[K]>();
      // @ts-ignore yes typescript, I know what I'm doing
      this.listeners[type] = created;
      return created;
   }

   /**
    * Register an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   addListener<K extends keyof ClientEvents>(
      type: K,
      callback: ClientEvents[K]
   ): this {
      this.getSet(type).add(callback);
      return this;
   }

   /**
    * Alias for addListener
    */
   on = this.addListener;

   /**
    * Unregister an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   off<K extends keyof ClientEvents>(type: K, callback: ClientEvents[K]): this {
      this.listeners[type]?.delete(callback);
      return this;
   }

   /**
    * Register a one-time event listener.
    * @param type The event
    * @param callback The Callback
    * @returns
    */
   once<K extends keyof ClientEvents>(
      type: K,
      callback: ClientEvents[K]
   ): this {
      const wrapper = ((...args: Parameters<ClientEvents[K]>) => {
         this.off(type, wrapper as ClientEvents[K]);
         (callback as any)(...args);
      }) as ClientEvents[K];

      this.addListener(type, wrapper);
      return this;
   }

   /**
    * Emit an event.
    * @param type The event
    * @param args The event arguments
    */
   protected emit<K extends keyof ClientEvents>(
      type: K,
      ...args: Parameters<ClientEvents[K]>
   ): void {
      this.listeners[type]?.forEach((cb) => (cb as any)(...args));
   }

   /**
    * Send a message to PuryFi.
    * If you are using this SDK, you probably don't need to use this function directly.
    * Look at PuryFi.actions for higher level functions.
    * @param message Message Object to send to PuryFi
    */
   sendMessage(message: BasicMessage) {
      let uid = uuidv4();
      this.log("Sending message to PuryFi:", JSON.stringify(message));
      let encoded = encode({ ...message, message_id: uid });
      const arrayBuffer = encoded.buffer.slice(
         encoded.byteOffset,
         encoded.byteOffset + encoded.byteLength
      );
      this.upstream.send(arrayBuffer);
      return uid;
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
      let message = decode(payload) as BasicMessage;
      switch (message.type) {
         case "handshake":
            this.log("Received handshake message from PuryFi");
            this.handleHandshake(message);
            break;
         case "event":
            this.log("Received event message from PuryFi:", message.name);
            this.emit("event", message);
            break;
         case "query":
            this.log("Received query response from PuryFi:", message.name);
            if (message.message_id && this.responseHooks[message.message_id]) {
               this.responseHooks[message.message_id](
                  replaceWorkaroundWithUndefined(message.data)
               );
            } else {
               this.log(
                  "No response hook found for message ID:",
                  message.message_id
               );
            }
      }
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
   private handleError(error: string) {
      this.log("Upstream connection error:", error);
      this.emit("error", error);
   }

   private handleHandshake(message: BasicMessage) {
      switch (message.name) {
         case "hello":
            this.log("Received handshake hello from PuryFi");
            this.sendMessage({
               type: "handshake",
               name: "intents",
               data: {
                  intents: this.config.intents,
               },
            });
            this.log("Sent configuration intents to PuryFi");
            break;
         case "ok":
            this.log("Received handshake intents OK from PuryFi");
            this.sendMessage({
               type: "handshake",
               name: "config",
               data: generateConfigurationMessage(
                  this.config,
                  this.customConfig
               ),
            });
            this.log("Sent configuration data to PuryFi");
            break;
         case "refused":
            this.log("Received handshake intents REFUSED from PuryFi");
            this.emit(
               "error",
               "Connection refused by PuryFi client. Intents rejected."
            );
            break;
         case "config":
            this.log("Received configuration data from PuryFi");
            let configData = message.data as ConfigurationMessageField[];
            configData.forEach((field) => {
               if (
                  this.customConfig[field.fieldName] === undefined ||
                  this.customConfig[field.fieldName].value !== field.value
               ) {
                  this.customConfig[field.fieldName] = {
                     value: field.value,
                     valueType: field.valueType,
                     displayName: field.displayName,
                  };
                  this.emit("config", field.fieldName, field.value);
               }
            });
            this.emit("ready");
            this.log("Emitted ready event");
            break;
      }
   }

   sendQueries<Queries extends readonly Query[]>(
      ...queries: Queries
   ): Promise<QueriesResult<Queries>> {
      return new Promise((resolve, reject) => {
         let uid = this.sendMessage({
            type: "query",
            name: "request",
            data: { queries },
         });

         let timer = setTimeout(() => {
            reject("Query timed out");
         }, 5000);

         this.responseHooks[uid] = (response: QueriesResult<Queries>) => {
            clearTimeout(timer);
            delete this.responseHooks[uid];
            resolve(response);
         };
      });
   }
}

function replaceWorkaroundWithUndefined(obj: any): any {
   if (obj === null) {
      return undefined;
   } else if (Array.isArray(obj)) {
      return obj.map(replaceWorkaroundWithUndefined);
   } else if (obj && typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
         newObj[key] = replaceWorkaroundWithUndefined(obj[key]);
      }
      return newObj;
   } else {
      return obj;
   }
}
