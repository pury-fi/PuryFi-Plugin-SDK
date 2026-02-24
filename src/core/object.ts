export interface Rect {
   x: number;
   y: number;
   width: number;
   height: number;
}

export interface Object {
   rect: Rect;
   label: number;
   score: number;
   id: number;
}

export enum Label {
   Tummy = 0,
   TummyCovered = 1,
   Buttocks = 2,
   ButtocksCovered = 3,
   FemaleBreast = 4,
   FemaleBreastCovered = 5,
   FemaleGenitals = 6,
   FemaleGenitalsCovered = 7,
   MaleGenitalsCovered = 8,
   MaleGenitals = 9,
   MaleBreast = 10,
   MaleBreastCovered = 11,
   FaceFemale = 12,
   FaceMale = 13,
   FootCovered = 14,
   Foot = 15,
   ArmpitCovered = 16,
   Armpit = 17,
   AnusCovered = 18,
   Anus = 19,
   Eye = 20,
   Mouth = 21,
   NippleCovered = 22,
   Nipple = 23,
   HandCovered = 24,
   Hand = 25,
}

export function isRect(value: any): value is Rect {
   return (
      typeof value === "object" &&
      value !== null &&
      typeof value.x === "number" &&
      typeof value.y === "number" &&
      typeof value.width === "number" &&
      typeof value.height === "number"
   );
}

export function isObject(value: any): value is Object {
   return (
      typeof value === "object" &&
      value !== null &&
      isRect(value.rect) &&
      typeof value.label === "number" &&
      typeof value.score === "number" &&
      typeof value.id === "number"
   );
}
