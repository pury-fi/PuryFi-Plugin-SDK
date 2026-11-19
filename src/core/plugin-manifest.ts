export interface PluginCensorMode {
   id: string;
   name: string;
   tooltip?: string;
   icon?: string;
   supportsVideo?: boolean;
   supportsImage?: boolean;
   supportsMixedMode?: boolean;
}

export interface PluginManifest {
   name: null | string;
   version: null | string;
   description: null | string;
   author: null | string;
   website: null | string;
   icon?: string;
   censorModes?: PluginCensorMode[];
}
