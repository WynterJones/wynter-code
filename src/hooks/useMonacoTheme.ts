import { useEffect, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { EditorTheme } from "@/stores/settingsStore";

// One Dark theme (Atom One Dark inspired)
const oneDarkTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "5c6370", fontStyle: "italic" },
    { token: "keyword", foreground: "c678dd" },
    { token: "string", foreground: "98c379" },
    { token: "number", foreground: "d19a66" },
    { token: "type", foreground: "e5c07b" },
    { token: "class", foreground: "e5c07b" },
    { token: "function", foreground: "61afef" },
    { token: "variable", foreground: "e06c75" },
    { token: "operator", foreground: "56b6c2" },
    { token: "constant", foreground: "d19a66" },
    { token: "tag", foreground: "e06c75" },
    { token: "attribute.name", foreground: "d19a66" },
    { token: "attribute.value", foreground: "98c379" },
  ],
  colors: {
    "editor.background": "#282c34",
    "editor.foreground": "#abb2bf",
    "editor.lineHighlightBackground": "#2c313c",
    "editor.selectionBackground": "#3e4451",
    "editorCursor.foreground": "#528bff",
    "editorWhitespace.foreground": "#3b4048",
    "editorIndentGuide.background": "#3b4048",
    "editorIndentGuide.activeBackground": "#636d83",
    "editor.selectionHighlightBackground": "#3e445180",
    "editorLineNumber.foreground": "#495162",
    "editorLineNumber.activeForeground": "#abb2bf",
    "editorGutter.background": "#282c34",
    "scrollbarSlider.background": "#4e566680",
    "scrollbarSlider.hoverBackground": "#5a637580",
    "scrollbarSlider.activeBackground": "#747d9180",
  },
};

// Dracula theme
const draculaTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "6272a4", fontStyle: "italic" },
    { token: "keyword", foreground: "ff79c6" },
    { token: "string", foreground: "f1fa8c" },
    { token: "number", foreground: "bd93f9" },
    { token: "type", foreground: "8be9fd", fontStyle: "italic" },
    { token: "class", foreground: "8be9fd" },
    { token: "function", foreground: "50fa7b" },
    { token: "variable", foreground: "f8f8f2" },
    { token: "operator", foreground: "ff79c6" },
    { token: "constant", foreground: "bd93f9" },
    { token: "tag", foreground: "ff79c6" },
    { token: "attribute.name", foreground: "50fa7b" },
    { token: "attribute.value", foreground: "f1fa8c" },
  ],
  colors: {
    "editor.background": "#282a36",
    "editor.foreground": "#f8f8f2",
    "editor.lineHighlightBackground": "#44475a",
    "editor.selectionBackground": "#44475a",
    "editorCursor.foreground": "#f8f8f2",
    "editorWhitespace.foreground": "#44475a",
    "editorIndentGuide.background": "#44475a",
    "editorIndentGuide.activeBackground": "#6272a4",
    "editor.selectionHighlightBackground": "#44475a80",
    "editorLineNumber.foreground": "#6272a4",
    "editorLineNumber.activeForeground": "#f8f8f2",
    "editorGutter.background": "#282a36",
    "scrollbarSlider.background": "#44475a80",
    "scrollbarSlider.hoverBackground": "#44475a",
    "scrollbarSlider.activeBackground": "#6272a4",
  },
};

// GitHub Dark theme
const githubDarkTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "8b949e", fontStyle: "italic" },
    { token: "keyword", foreground: "ff7b72" },
    { token: "string", foreground: "a5d6ff" },
    { token: "number", foreground: "79c0ff" },
    { token: "type", foreground: "ffa657" },
    { token: "class", foreground: "ffa657" },
    { token: "function", foreground: "d2a8ff" },
    { token: "variable", foreground: "ffa657" },
    { token: "operator", foreground: "ff7b72" },
    { token: "constant", foreground: "79c0ff" },
    { token: "tag", foreground: "7ee787" },
    { token: "attribute.name", foreground: "79c0ff" },
    { token: "attribute.value", foreground: "a5d6ff" },
  ],
  colors: {
    "editor.background": "#0d1117",
    "editor.foreground": "#c9d1d9",
    "editor.lineHighlightBackground": "#161b22",
    "editor.selectionBackground": "#264f78",
    "editorCursor.foreground": "#c9d1d9",
    "editorWhitespace.foreground": "#484f58",
    "editorIndentGuide.background": "#21262d",
    "editorIndentGuide.activeBackground": "#30363d",
    "editor.selectionHighlightBackground": "#3fb95040",
    "editorLineNumber.foreground": "#484f58",
    "editorLineNumber.activeForeground": "#c9d1d9",
    "editorGutter.background": "#0d1117",
    "scrollbarSlider.background": "#484f5880",
    "scrollbarSlider.hoverBackground": "#484f58",
    "scrollbarSlider.activeBackground": "#6e7681",
  },
};

// Catppuccin Ultrathin theme (matches app UI)
const catppuccinUltrathinTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "6c7086", fontStyle: "italic" },
    { token: "keyword", foreground: "cba6f7" },
    { token: "string", foreground: "a6e3a1" },
    { token: "number", foreground: "fab387" },
    { token: "type", foreground: "f9e2af" },
    { token: "class", foreground: "f9e2af" },
    { token: "function", foreground: "89b4fa" },
    { token: "variable", foreground: "f38ba8" },
    { token: "operator", foreground: "94e2d5" },
    { token: "constant", foreground: "fab387" },
    { token: "tag", foreground: "89b4fa" },
    { token: "attribute.name", foreground: "f9e2af" },
    { token: "attribute.value", foreground: "a6e3a1" },
    { token: "delimiter", foreground: "9399b2" },
    { token: "delimiter.bracket", foreground: "9399b2" },
    { token: "meta", foreground: "f5c2e7" },
  ],
  colors: {
    "editor.background": "#141420",
    "editor.foreground": "#cdd6f4",
    "editor.lineHighlightBackground": "#1e1e2e",
    "editor.selectionBackground": "#45475a",
    "editorCursor.foreground": "#f5e0dc",
    "editorWhitespace.foreground": "#313244",
    "editorIndentGuide.background": "#313244",
    "editorIndentGuide.activeBackground": "#45475a",
    "editor.selectionHighlightBackground": "#45475a50",
    "editorLineNumber.foreground": "#45475a",
    "editorLineNumber.activeForeground": "#cdd6f4",
    "editorGutter.background": "#141420",
    "scrollbarSlider.background": "#31324450",
    "scrollbarSlider.hoverBackground": "#45475a80",
    "scrollbarSlider.activeBackground": "#585b70",
    "editorWidget.background": "#0f0f18",
    "editorWidget.border": "#2a2a3a",
    "editorSuggestWidget.background": "#0f0f18",
    "editorSuggestWidget.border": "#2a2a3a",
    "editorSuggestWidget.selectedBackground": "#252535",
    "editorHoverWidget.background": "#0f0f18",
    "editorHoverWidget.border": "#2a2a3a",
  },
};

// Monokai theme
const monokaiTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "comment", foreground: "75715e", fontStyle: "italic" },
    { token: "keyword", foreground: "f92672" },
    { token: "string", foreground: "e6db74" },
    { token: "number", foreground: "ae81ff" },
    { token: "type", foreground: "66d9ef", fontStyle: "italic" },
    { token: "class", foreground: "a6e22e" },
    { token: "function", foreground: "a6e22e" },
    { token: "variable", foreground: "f8f8f2" },
    { token: "operator", foreground: "f92672" },
    { token: "constant", foreground: "ae81ff" },
    { token: "tag", foreground: "f92672" },
    { token: "attribute.name", foreground: "a6e22e" },
    { token: "attribute.value", foreground: "e6db74" },
  ],
  colors: {
    "editor.background": "#272822",
    "editor.foreground": "#f8f8f2",
    "editor.lineHighlightBackground": "#3e3d32",
    "editor.selectionBackground": "#49483e",
    "editorCursor.foreground": "#f8f8f0",
    "editorWhitespace.foreground": "#464741",
    "editorIndentGuide.background": "#464741",
    "editorIndentGuide.activeBackground": "#767166",
    "editor.selectionHighlightBackground": "#49483e80",
    "editorLineNumber.foreground": "#90908a",
    "editorLineNumber.activeForeground": "#f8f8f2",
    "editorGutter.background": "#272822",
    "scrollbarSlider.background": "#49483e80",
    "scrollbarSlider.hoverBackground": "#49483e",
    "scrollbarSlider.activeBackground": "#75715e",
  },
};

const themes = {
  "one-dark": oneDarkTheme,
  dracula: draculaTheme,
  "github-dark": githubDarkTheme,
  monokai: monokaiTheme,
  "catppuccin-ultrathin": catppuccinUltrathinTheme,
};

export function useMonacoTheme(
  monaco: Monaco | null,
  theme: EditorTheme
): string {
  const themesRegistered = useRef(false);

  useEffect(() => {
    if (monaco && !themesRegistered.current) {
      // Register all custom themes
      Object.entries(themes).forEach(([name, themeData]) => {
        monaco.editor.defineTheme(name, themeData);
      });
      themesRegistered.current = true;
    }
  }, [monaco]);

  // Map theme names to Monaco theme names
  if (theme === "vs-dark") {
    return "vs-dark";
  }
  return theme;
}

export function defineMonacoThemes(monaco: Monaco) {
  Object.entries(themes).forEach(([name, themeData]) => {
    monaco.editor.defineTheme(name, themeData);
  });
}
