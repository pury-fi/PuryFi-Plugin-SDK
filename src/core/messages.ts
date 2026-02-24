import {
   PluginManifest,
   PluginConfiguration,
   ReadOnlyPath,
   ReadOnlyValue,
   WriteOnlyPath,
   WriteOnlyValue,
} from ".";

export type TypeArgument<T> = T extends (type: infer A, payload: any) => any
   ? A
   : never;

export type ExtractByTypeArgument<T, U> = T extends (
   type: U,
   payload: any
) => any
   ? T
   : never;

export type PayloadArgument<T> = T extends (type: any, payload: infer A) => any
   ? A
   : never;

export type Return<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * ====================================================================
 * Incoming Messages
 * ====================================================================
 */

type stateChangePayload<P extends ReadOnlyPath> = {
   path: P;
   value: ReadOnlyValue<P>;
};

type AnystateChangePayload = {
   [P in ReadOnlyPath]: stateChangePayload<P>;
}[ReadOnlyPath];

/**
 * Messages sent by the extension to plugins
 */
namespace IncomingMessages {
   export type Ready = (
      type: "ready",
      payload: {
         version: string;
      }
   ) => void;

   export type ConfigurationChange = (
      type: "configurationChange",
      payload: {
         configuration: PluginConfiguration;
      }
   ) => void;

   export type IntentsGrant = (
      type: "intentsGrant",
      payload: {
         intents: Intent[];
      }
   ) => void;

   export type StateChange = (
      type: "stateChange",
      payload: AnystateChangePayload
   ) => void;

   export type StaticMediaScan = (
      type: "staticMediaScan",
      payload: {
         objects: {
            rect: { x: number; y: number; width: number; height: number };
            label: number;
            score: number;
            id: number;
         }[];
      }
   ) => void;
}

export type IncomingMessage =
   | IncomingMessages.Ready
   | IncomingMessages.IntentsGrant
   | IncomingMessages.StateChange
   | IncomingMessages.StaticMediaScan;

export type IncomingMessageObject = {
   [K in TypeArgument<IncomingMessage>]: {
      type: K;
      payload: PayloadArgument<ExtractByTypeArgument<IncomingMessage, K>>;
   };
}[TypeArgument<IncomingMessage>];

/**
 * ===================================================================
 * Outgoing Messages
 * ===================================================================
 */

type SetStatePayload<P extends WriteOnlyPath> = {
   path: P;
   value: WriteOnlyValue<P>;
};

type AnySetStatePayload = {
   [P in WriteOnlyPath]: SetStatePayload<P>;
}[WriteOnlyPath];

type AnyOutgoingGetStateMessage = {
   [P in ReadOnlyPath]: (
      type: "getState",
      payload: {
         path: P;
      }
   ) => {
      value: ReadOnlyValue<P>;
   };
}[ReadOnlyPath];

/**
 * Messages sent by plugins to the extension
 */
namespace OutgoingMessages {
   export type RequestIntents = (
      type: "requestIntents",
      payload: {
         intents: Intent[];
      }
   ) => {};

   export type GetPendingIntents = (
      type: "getPendingIntents",
      payload: {}
   ) => {
      pendingIntents: Intent[];
   };

   export type GetIntents = (
      type: "getIntents",
      payload: {}
   ) => {
      intents: Intent[];
   };

   export type SetManifest = (
      type: "setManifest",
      payload: {
         manifest: PluginManifest;
      }
   ) => {};

   export type GetManifest = (
      type: "getManifest",
      payload: {}
   ) => {
      manifest: PluginManifest;
   };

   export type SetConfiguration = (
      type: "setConfiguration",
      payload: {
         configuration: PluginConfiguration;
      }
   ) => {};

   export type GetConfiguration = (
      type: "getConfiguration",
      payload: {}
   ) => {
      configuration: PluginConfiguration;
   };

   export type SetState = (type: "setState", payload: AnySetStatePayload) => {};

   export type GetState = AnyOutgoingGetStateMessage;

   export type WatchState = (
      type: "watchState",
      payload: {
         path: ReadOnlyPath;
      }
   ) => {};

   export type UnwatchState = (
      type: "unwatchState",
      payload: {
         path: ReadOnlyPath;
      }
   ) => {};

   export type WatchStaticMediaScans = (
      type: "watchStaticMediaScans",
      payload: {}
   ) => {};

   export type UnwatchStaticMediaScans = (
      type: "unwatchStaticMediaScans",
      payload: {}
   ) => {};

   export type ScanStaticMedia = (
      type: "scanStaticMedia",
      payload: {
         image: ArrayBuffer;
         // TODO: Add other properties
      }
   ) => {
      objects: {
         rect: { x: number; y: number; width: number; height: number };
         label: number;
         score: number;
         id: number;
      }[];
   };

   export type CensorStaticMedia = (
      type: "censorStaticMedia",
      payload: {
         image: ArrayBuffer;
         // TODO: Add other properties
      }
   ) => {
      image: ArrayBuffer;
      objects: {
         rect: { x: number; y: number; width: number; height: number };
         label: number;
         score: number;
         id: number;
      }[];
   };

   export type EnterLockPassword = (
      type: "enterLockPassword",
      payload: {
         secret: string;
      }
   ) => {};

   export type EnterLockEmergencyServerToken = (
      type: "enterLockEmergencyServerToken",
      payload: { emergencyServerToken: number }
   ) => {};
}

export type OutgoingMessage =
   | OutgoingMessages.RequestIntents
   | OutgoingMessages.GetPendingIntents
   | OutgoingMessages.GetIntents
   | OutgoingMessages.SetManifest
   | OutgoingMessages.GetManifest
   | OutgoingMessages.SetConfiguration
   | OutgoingMessages.GetConfiguration
   | OutgoingMessages.SetState
   | OutgoingMessages.GetState
   | OutgoingMessages.WatchState
   | OutgoingMessages.UnwatchState
   | OutgoingMessages.WatchStaticMediaScans
   | OutgoingMessages.UnwatchStaticMediaScans
   | OutgoingMessages.ScanStaticMedia
   | OutgoingMessages.CensorStaticMedia
   | OutgoingMessages.EnterLockPassword
   | OutgoingMessages.EnterLockEmergencyServerToken;

export type OutgoingMessageObject = {
   [K in TypeArgument<OutgoingMessage>]: {
      type: K;
      payload: PayloadArgument<ExtractByTypeArgument<OutgoingMessage, K>>;
   };
}[TypeArgument<OutgoingMessage>];

/**
 * ====================================================================
 * Intents
 * ====================================================================
 */

// TODO: Implement intents

export const Intents = [
   "readEnabled",
   "writeEnabled",
   "readLockConfiguration",
   "writeLockConfiguration",
   "readWBlistConfiguration",
   "writeWBlistConfiguration",
   "readUser",
   "readMediaProcesses",
   "requestMediaProcesses",
   "requestMediaProcesses",
] as const;
export type Intent = (typeof Intents)[number];
