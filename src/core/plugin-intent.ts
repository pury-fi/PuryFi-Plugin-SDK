export const PluginIntents = [
   "readEnabledState",
   "writeEnabledState",
   "readLockConfigurationState",
   "writeLockConfigurationState",
   "readWBlistConfigurationState",
   "writeWBlistConfigurationState",
   "readUserState",
   "readMediaProcesses",
   "requestMediaProcesses",
] as const;
export type PluginIntent = (typeof PluginIntents)[number];
