export const PluginIntents = [
   "readEnabledState",
   "writeEnabledState",
   "readLockConfigurationState",
   "writeLockConfigurationState",
   "readWBlistConfigurationState",
   "writeWBlistConfigurationState",
   "readUserState",
   "readMediaProcessesState",
   "requestMediaProcessesState",
] as const;
export type PluginIntent = (typeof PluginIntents)[number];
