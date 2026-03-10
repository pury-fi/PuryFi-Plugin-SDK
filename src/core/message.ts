import {
   PluginConfiguration,
   ReadOnlyPath,
   ReadOnlyValue,
   WriteOnlyPath,
   WriteOnlyValue,
} from ".";
import { PluginIntent } from "./intent";
import { PluginManifest } from "./manifest";
import { Object } from "./object";

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
         apiVersion: string;
      }
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "incompatibleApiVersion";
        };

   export type ConfigurationChange = (
      type: "configurationChange",
      payload: {
         configuration: PluginConfiguration;
      }
   ) => void;

   export type IntentsGrant = (
      type: "intentsGrant",
      payload: {
         intents: PluginIntent[];
      }
   ) => void;

   export type StateChange = (
      type: "stateChange",
      payload: AnystateChangePayload
   ) => void;

   export type StaticMediaScan = (
      type: "staticMediaScan",
      payload: {
         objects: Object[];
      }
   ) => void;
}

export type IncomingMessage =
   | IncomingMessages.Ready
   | IncomingMessages.ConfigurationChange
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
   ) =>
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
        };
}[ReadOnlyPath];

/**
 * Messages sent by plugins to the extension
 */
namespace OutgoingMessages {
   export type RequestIntents = (
      type: "requestIntents",
      payload: {
         intents: PluginIntent[];
      }
   ) =>
      | {
           type: "ok";
           pendingIntents: PluginIntent[];
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type GetPendingIntents = (
      type: "getPendingIntents",
      payload: {}
   ) =>
      | {
           type: "ok";
           pendingIntents: PluginIntent[];
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type GetIntents = (
      type: "getIntents",
      payload: {}
   ) =>
      | {
           type: "ok";
           intents: PluginIntent[];
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type SetManifest = (
      type: "setManifest",
      payload: {
         manifest: PluginManifest;
      }
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type GetManifest = (
      type: "getManifest",
      payload: {}
   ) =>
      | {
           type: "ok";
           manifest: PluginManifest;
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type SetConfiguration = (
      type: "setConfiguration",
      payload: {
         configuration: PluginConfiguration;
      }
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type GetConfiguration = (
      type: "getConfiguration",
      payload: {}
   ) =>
      | {
           type: "ok";
           configuration: PluginConfiguration;
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type SetState = (
      type: "setState",
      payload: AnySetStatePayload
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "unavailablePath";
           message: string;
        };

   // TODO: Update return type of this message

   export type GetState = AnyOutgoingGetStateMessage;

   export type WatchState = (
      type: "watchState",
      payload: {
         path: ReadOnlyPath;
      }
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type UnwatchState = (
      type: "unwatchState",
      payload: {
         path: ReadOnlyPath;
      }
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
           message: string;
        };

   export type WatchStaticMediaScans = (
      type: "watchStaticMediaScans",
      payload: {}
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
        };

   export type UnwatchStaticMediaScans = (
      type: "unwatchStaticMediaScans",
      payload: {}
   ) =>
      | {
           type: "ok";
        }
      | {
           type: "error";
           name: "internalError" | "invalidMessage" | "missingIntents";
        };

   export type ScanStaticMedia = (
      type: "scanStaticMedia",
      payload: {
         image: Uint8Array;
      }
   ) =>
      | {
           type: "ok";
           objects: Object[];
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "invalidImage";
           message: string;
        };

   export type CensorStaticMedia = (
      type: "censorStaticMedia",
      payload: {
         image: Uint8Array;
         objects: null | Object[];
      }
   ) =>
      | {
           type: "ok";
           image: Uint8Array;
           objects: Object[];
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "invalidImage";
           message: string;
        };

   export type EnterLockPassword = (
      type: "enterLockPassword",
      payload: { secret: string }
   ) =>
      | {
           type: "ok";
           image: Uint8Array;
           objects: Object[];
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "noEnabledLock"
              | "noEnabledLockPassword"
              | "incorrectLockPassword";
        };

   export type EnterLockEmergencyServerToken = (
      type: "enterLockEmergencyServerToken",
      payload: { emergencyServerToken: number }
   ) =>
      | {
           type: "ok";
           image: Uint8Array;
           objects: Object[];
        }
      | {
           type: "error";
           name:
              | "internalError"
              | "invalidMessage"
              | "missingIntents"
              | "noEnabledLock"
              | "incorrectLockEmergencyServerToken";
        };
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
