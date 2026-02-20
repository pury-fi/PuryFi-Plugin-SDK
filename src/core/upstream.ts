import { PuryFiError } from ".";

export type UpstreamEvents = {
   error: (error: PuryFiError) => void;
   message: (event: ArrayBuffer) => void;
   open: () => void;
   close: () => void;
};

export abstract class PuryFiUpstream {
   private debug: boolean = false;
   protected listeners: { [K: string]: Set<(...args: any[]) => void> } = {};
   abstract send(data: ArrayBuffer | string): void;

   private getSet<K extends keyof UpstreamEvents>(
      type: K
   ): Set<UpstreamEvents[K]> {
      const existing = this.listeners[type];
      if (existing) return existing;

      const created = new Set<UpstreamEvents[K]>();
      // @ts-ignore yes typescript, I know what I'm doing
      this.listeners[type] = created;
      return created;
   }

   /**
    * Register an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   addListener<K extends keyof UpstreamEvents>(
      type: K,
      callback: UpstreamEvents[K]
   ): this {
      this.getSet(type).add(callback);
      return this;
   }

   /**
    * Alias for addListener
    */
   on = this.addListener;

   /**
    * Unregister an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   off<K extends keyof UpstreamEvents>(
      type: K,
      callback: UpstreamEvents[K]
   ): this {
      this.listeners[type]?.delete(callback);
      return this;
   }

   /**
    * Emit an event.
    * @param type The event
    * @param args The event arguments
    */
   protected emit<K extends keyof UpstreamEvents>(
      type: K,
      ...args: Parameters<UpstreamEvents[K]>
   ): void {
      this.listeners[type]?.forEach((cb) => (cb as any)(...args));
   }

   /**
    * Enable or disable debug logging.
    * @param enabled debug state
    */
   setDebug(enabled: boolean) {
      this.debug = enabled;
   }

   protected log(...args: any[]) {
      if (this.debug) {
         console.log("[PuryFi SDK]", ...args);
      }
   }
}
