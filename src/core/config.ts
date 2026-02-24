export interface PluginManifest {
   name: null | string;
   version: null | string;
   description: null | string;
   author: null | string;
   website: null | string;
}

export interface PluginConfigurationField {
   name: string;
   type: "string" | "number" | "boolean";
   value: string | number | boolean;
}

export type PluginConfiguration = Record<string, PluginConfigurationField>;
