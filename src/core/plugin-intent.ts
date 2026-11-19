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
   "requestMediaCensorHooks",
   "readPureVisionState",
   "readMediaSource",
   "readMediaContent",
] as const;
export type PluginIntent = (typeof PluginIntents)[number];
