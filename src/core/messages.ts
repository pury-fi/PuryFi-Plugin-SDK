import { PluginConfiguration, PluginCustomConfiguration } from ".";

export interface PluginConfigMessage {
    name: string;
    version: string;
    description?: string;
    author?: string;
    website?: string;
    customConfigurations: { value: string | number | boolean, valueType: 'string' | 'number' | 'boolean', displayName: string, fieldName: string }[]
}

export function generateConfigMessage(config: PluginConfiguration, customConfig?: PluginCustomConfiguration): PluginConfigMessage {
    return {
        ...config,
        customConfigurations: customConfig ? Object.entries(customConfig).map(([fieldName, field]) => ({
            ...field,
            fieldName
        })) : []
    }
}

export interface BasicMessage {
    type: "event" | "handshake" | "action",
    name: string,
    data: any
}

export interface ConfigurationMessageField {
    value: string | number | boolean;
    valueType: 'string' | 'number' | 'boolean';
    fieldName: string;
    displayName: string;
}