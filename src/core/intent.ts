export const PluginIntents = [
   "readEnabled",
   "writeEnabled",
   "readLockConfiguration",
   "writeLockConfiguration",
   "readWBlistConfiguration",
   "writeWBlistConfiguration",
   "readUser",
   "readMediaProcesses",
   "requestMediaProcesses",
] as const;
export type PluginIntent = (typeof PluginIntents)[number];
