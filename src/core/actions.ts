import { PuryFi } from ".";

export class PuryFiPluginActions {
   puryfi: PuryFi;

   constructor(puryfi: PuryFi) {
      this.puryfi = puryfi;
   }

   connectPurevision() {
      this.puryfi.sendMessage({
         type: "action",
         name: "connect_purevision",
         data: {},
      });
   }
}
