export interface PluginManifest {
   name?: string;
   version?: string;
   description?: string;
   author?: string;
   website?: string;
}

export interface PluginConfigurationField {
   name: string;
   type: "string" | "number" | "boolean";
   value: string | number | boolean;
}

export type PluginConfiguration = Record<string, PluginConfigurationField>;
