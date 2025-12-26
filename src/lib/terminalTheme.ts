import type { ITheme } from "@xterm/xterm";

/**
 * Terminal theme matching the app's Catppuccin-inspired palette.
 * Maps app CSS variables to xterm.js theme properties.
 */
export const terminalTheme: ITheme = {
  // Backgrounds - use --bg-tertiary for consistency with app
  background: "#0a0a10",
  foreground: "#cdd6f4", // --text-primary
  cursor: "#cba6f7", // --accent (purple)
  cursorAccent: "#0a0a10", // --bg-tertiary
  selectionBackground: "rgba(203, 166, 247, 0.3)", // --accent @ 30% opacity
  selectionForeground: "#cdd6f4", // --text-primary

  // Standard ANSI colors mapped to app accents
  black: "#0f0f18", // --bg-secondary
  red: "#f38ba8", // --accent-red
  green: "#a6e3a1", // --accent-green
  yellow: "#f9e2af", // --accent-yellow
  blue: "#89b4fa", // --accent-blue
  magenta: "#cba6f7", // --accent (purple)
  cyan: "#94e2d5", // --accent-cyan
  white: "#cdd6f4", // --text-primary

  // Bright variants
  brightBlack: "#2a2a3a", // --border
  brightRed: "#f5a0b4",
  brightGreen: "#b4eab0",
  brightYellow: "#fae8c0",
  brightBlue: "#a0c4fc",
  brightMagenta: "#d4b8fa",
  brightCyan: "#a8e8df",
  brightWhite: "#e4e8f8",
};
