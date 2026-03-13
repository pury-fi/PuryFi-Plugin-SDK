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
