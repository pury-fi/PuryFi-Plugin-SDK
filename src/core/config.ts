export interface PluginConfiguration {
    name: string;
    version: string;
    description?: string;
    author?: string;
    website?: string;
    intents: string[];
}

export interface CustomConfigurationField {
    value: string | number | boolean;
    valueType: 'string' | 'number' | 'boolean';
    displayName: string;
}

export type PluginCustomConfiguration = {
    [key: string]: CustomConfigurationField;
};

