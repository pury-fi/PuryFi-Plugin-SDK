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
   "readPureVisionState"
] as const;
export type PluginIntent = (typeof PluginIntents)[number];
