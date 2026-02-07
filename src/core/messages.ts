import { PluginConfiguration, PluginCustomConfiguration } from ".";

export interface PluginConfigMessage {
    name: string;
    version: string;
    description?: string;
    author?: string;
    website?: string;
    configuration: { value: string | number | boolean, valueType: 'string' | 'number' | 'boolean', displayName: string, fieldName: string }[]
}

export function generateConfigMessage(config: PluginConfiguration, customConfig?: PluginCustomConfiguration): PluginConfigMessage {
    return {
        ...config,
        configuration: customConfig ? Object.entries(customConfig).map(([fieldName, field]) => ({
            ...field,
            fieldName
        })) : []
    }
}

export interface BasicMessage {
    type: "event" | "handshake" | "action" | "query",
    name: string,
    data: any
    message_id?: string;
}

export interface ConfigurationMessageField {
    value: string | number | boolean;
    valueType: 'string' | 'number' | 'boolean';
    fieldName: string;
    displayName: string;
}