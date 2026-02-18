import { PuryFiConnection } from ".";

export class PuryFiPluginActions {
   puryfi: PuryFiConnection;

   constructor(puryfi: PuryFiConnection) {
      this.puryfi = puryfi;
   }
}
