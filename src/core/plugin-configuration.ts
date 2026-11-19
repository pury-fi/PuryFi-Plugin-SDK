export interface PluginConfigurationOption {
   label?: string;
   name?: string;
   value: string | number;
}

export interface PluginActionConfigurationOption {
   buttonLabel?: string;
   hideHeader?: boolean;
   [key: string]: any;
}

export interface PluginConfigurationField {
   name: string;
   type: "string" | "number" | "boolean" | "select" | "multiselect" | "action" | "color" | string;
   value: string | number | boolean | (string | number)[];
   options?: PluginConfigurationOption[] | Record<string, { name: string }> | PluginActionConfigurationOption | any;
   buttonLabel?: string;
   description?: string;
   tooltip?: string;
}

export type PluginConfiguration = Record<string, PluginConfigurationField>;
