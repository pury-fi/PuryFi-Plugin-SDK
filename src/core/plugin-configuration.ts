export interface PluginConfigurationOption {
   label?: string;
   name?: string;
   value: string | number;
}

export interface PluginConfigurationField {
   name: string;
   type: "string" | "number" | "boolean" | "select" | "multiselect" | "action";
   value: string | number | boolean | (string | number)[];
   options?: PluginConfigurationOption[] | Record<string, { name: string }>;
}

export type PluginConfiguration = Record<string, PluginConfigurationField>;
