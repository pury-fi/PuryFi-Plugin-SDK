import { encode } from "@msgpack/msgpack";
import { ConnectionError } from ".";

export const versionReg = /^\d+\.\d+\.\d+\.\d+$/;
export const apiVersionReg = /^\d+\.\d+\.\d+$/;
export const minApiVersion = [1, 0, 0] as const;
export const maxApiVersion = [2, 0, 0] as const;

export function parseVersion(value: string, parts: number): number[] | null {
   const segments = value.split(".");
   if (segments.length !== parts) {
      return null;
   }

   const parsed = segments.map((segment) => Number(segment));
   return parsed.every((entry) => Number.isInteger(entry) && entry >= 0)
      ? parsed
      : null;
}

export function compareVersions(
   a: readonly number[],
   b: readonly number[]
): number {
   const maxLength = Math.max(a.length, b.length);
   for (let index = 0; index < maxLength; index++) {
      const left = a[index] ?? 0;
      const right = b[index] ?? 0;
      if (left > right) return 1;
      if (left < right) return -1;
   }

   return 0;
}

export function isVersion(value: unknown): value is string {
   return typeof value === "string" && versionReg.test(value);
}

export function isAPIVersion(value: unknown): value is string {
   return typeof value === "string" && apiVersionReg.test(value);
}

export type UpstreamConnectionEvents = {
   error: (error: ConnectionError) => void;
   message: (event: ArrayBuffer) => void;
   open: () => void;
   close: () => void;
};

export abstract class UpstreamConnection {
   private debug: boolean = false;
   protected listeners: { [K: string]: Set<(...args: any[]) => void> } = {};
   abstract send(data: ArrayBuffer | string): void;

   private getSet<K extends keyof UpstreamConnectionEvents>(
      type: K
   ): Set<UpstreamConnectionEvents[K]> {
      const existing = this.listeners[type];
      if (existing) return existing;

      const created = new Set<UpstreamConnectionEvents[K]>();
      // @ts-ignore yes typescript, I know what I'm doing
      this.listeners[type] = created;
      return created;
   }

   encodeMessage(message: any): ArrayBuffer {
      const encodedMessage = encode(message);

      const encodedMessageSlice = encodedMessage.buffer.slice(
         encodedMessage.byteOffset,
         encodedMessage.byteOffset + encodedMessage.byteLength
      );
      return encodedMessageSlice;
   }

   /**
    * Register an event listener.
    * @param type The event
    * @param callback The callback
    * @returns
    */
   addListener<K extends keyof UpstreamConnectionEvents>(
      type: K,
      callback: UpstreamConnectionEvents[K]
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
   off<K extends keyof UpstreamConnectionEvents>(
      type: K,
      callback: UpstreamConnectionEvents[K]
   ): this {
      this.listeners[type]?.delete(callback);
      return this;
   }

   /**
    * Emit an event.
    * @param type The event
    * @param args The event arguments
    */
   protected emit<K extends keyof UpstreamConnectionEvents>(
      type: K,
      ...args: Parameters<UpstreamConnectionEvents[K]>
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
