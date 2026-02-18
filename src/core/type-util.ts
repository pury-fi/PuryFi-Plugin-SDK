export function isArray(value: any): value is any[] {
   return Array.isArray(value);
}

export function isArrayOf(
   value: any,
   testItem: (item: any) => boolean
): value is any[] {
   return Array.isArray(value) && value.every((item) => testItem(item));
}

export function isObject(value: any): value is Record<string | number | symbol, unknown> {
   return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isObjectOf(
   value: any,
   entryCount: number,
   testEntry: (key: string | number | symbol, value: unknown) => boolean
): boolean {
   if (!isObject(value)) {
      return false;
   }

   const entries = Object.entries(value);
   if (entries.length !== entryCount) {
      return false;
   }

   for (const [key, value] of entries) {
      if (!testEntry(key, value)) {
         return false;
      }
   }

   return true;
}

export function isFunction(value: any): value is Function {
   return typeof value === "function";
}

export function isNumber(value: any): value is number {
   return typeof value === "number";
}

export function isBoolean(value: any): value is boolean {
   return typeof value === "boolean";
}

export function isString(value: any): value is string {
   return typeof value === "string";
}

export function isNull(value: any): value is null {
   return value === null;
}

export function isUndefined(value: any): value is undefined {
   return typeof value === "undefined";
}
