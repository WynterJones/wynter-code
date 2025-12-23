import type { ColorValue, HSLColor, ColorFormat } from "@/types/color";

/**
 * Convert RGB to HEX string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert HEX string to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: s,
    l: l,
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Format a color value to the specified format
 */
export function formatColor(color: ColorValue, format: ColorFormat): string {
  const { r, g, b, a } = color;

  switch (format) {
    case "hex":
      return `#${rgbToHex(r, g, b)}`;
    case "rgb":
      return `rgb(${r}, ${g}, ${b})`;
    case "rgba":
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    case "hsl": {
      const hsl = rgbToHsl(r, g, b);
      return `hsl(${hsl.h}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`;
    }
    case "hsla": {
      const hsl = rgbToHsl(r, g, b);
      return `hsla(${hsl.h}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%, ${a.toFixed(2)})`;
    }
    default:
      return `#${rgbToHex(r, g, b)}`;
  }
}

/**
 * Parse a color string to ColorValue
 */
export function parseColor(input: string): ColorValue | null {
  // Try HEX
  const hex = hexToRgb(input);
  if (hex) {
    return { ...hex, a: 1 };
  }

  // Try RGB/RGBA
  const rgbMatch = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Try HSL/HSLA
  const hslMatch = input.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
  if (hslMatch) {
    const rgb = hslToRgb(
      parseInt(hslMatch[1]),
      parseInt(hslMatch[2]) / 100,
      parseInt(hslMatch[3]) / 100
    );
    return {
      ...rgb,
      a: hslMatch[4] ? parseFloat(hslMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function getContrastRatio(color1: ColorValue, color2: ColorValue): number {
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get a readable text color (black or white) based on background color
 */
export function getTextColorForBackground(bg: ColorValue): "black" | "white" {
  const luminance = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b) / 255;
  return luminance > 0.5 ? "black" : "white";
}

/**
 * Generate shades of a color (lighter and darker variants)
 */
export function generateShades(color: ColorValue, count: number = 5): ColorValue[] {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const shades: ColorValue[] = [];

  for (let i = 0; i < count; i++) {
    const lightness = 0.1 + (i / (count - 1)) * 0.8; // Range from 10% to 90%
    const rgb = hslToRgb(hsl.h, hsl.s, lightness);
    shades.push({ ...rgb, a: color.a });
  }

  return shades;
}

/**
 * Copy color to clipboard
 */
export async function copyColorToClipboard(color: ColorValue, format: ColorFormat): Promise<void> {
  const text = formatColor(color, format);
  await navigator.clipboard.writeText(text);
}
