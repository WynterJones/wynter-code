export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SavedColor {
  id: string;
  value: ColorValue;
  hex: string;
  createdAt: string;
  name?: string;
}

export type ColorFormat = "hex" | "rgb" | "rgba" | "hsl" | "hsla";

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

export interface ColorResult {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}
