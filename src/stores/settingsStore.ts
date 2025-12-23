import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClaudeModel } from "@/types";

export type EditorTheme =
  | "one-dark"
  | "dracula"
  | "vs-dark"
  | "github-dark"
  | "monokai";

export type MarkdownViewMode = "edit" | "split" | "preview";
export type SidebarPosition = "left" | "right";
export type AppFont =
  | "jetbrains-mono"
  | "fira-code"
  | "source-code-pro"
  | "ibm-plex-mono"
  | "roboto-mono"
  | "space-mono";

export type TerminalShell = "system" | "bash" | "zsh" | "fish" | "sh";

export const TERMINAL_SHELLS: { id: TerminalShell; name: string; path: string | null }[] = [
  { id: "system", name: "System Default", path: null },
  { id: "bash", name: "Bash", path: "/bin/bash" },
  { id: "zsh", name: "Zsh", path: "/bin/zsh" },
  { id: "fish", name: "Fish", path: "/usr/local/bin/fish" },
  { id: "sh", name: "Sh", path: "/bin/sh" },
];

export const EDITOR_THEMES: { id: EditorTheme; name: string }[] = [
  { id: "one-dark", name: "One Dark" },
  { id: "dracula", name: "Dracula" },
  { id: "vs-dark", name: "VS Code Dark" },
  { id: "github-dark", name: "GitHub Dark" },
  { id: "monokai", name: "Monokai" },
];

export const APP_FONTS: { id: AppFont; name: string; family: string }[] = [
  { id: "jetbrains-mono", name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { id: "fira-code", name: "Fira Code", family: "'Fira Code', monospace" },
  { id: "source-code-pro", name: "Source Code Pro", family: "'Source Code Pro', monospace" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono", family: "'IBM Plex Mono', monospace" },
  { id: "roboto-mono", name: "Roboto Mono", family: "'Roboto Mono', monospace" },
  { id: "space-mono", name: "Space Mono", family: "'Space Mono', monospace" },
];

interface SettingsStore {
  defaultModel: ClaudeModel;
  sidebarWidth: number;
  sidebarPosition: SidebarPosition;
  theme: "dark";
  fontSize: number;
  appFont: AppFont;
  editorTheme: EditorTheme;
  editorFontSize: number;
  editorWordWrap: boolean;
  editorMinimap: boolean;
  markdownDefaultView: MarkdownViewMode;
  defaultBrowsePath: string;
  customMusicPath: string;
  compactProjectTabs: boolean;
  dimInactiveProjects: boolean;
  compressionArchiveOverwrite: boolean;
  compressionMediaOverwrite: boolean;
  terminalShell: TerminalShell;

  setDefaultModel: (model: ClaudeModel) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setFontSize: (size: number) => void;
  setAppFont: (font: AppFont) => void;
  setEditorTheme: (theme: EditorTheme) => void;
  setEditorFontSize: (size: number) => void;
  setEditorWordWrap: (wrap: boolean) => void;
  setEditorMinimap: (show: boolean) => void;
  setMarkdownDefaultView: (mode: MarkdownViewMode) => void;
  setDefaultBrowsePath: (path: string) => void;
  setCustomMusicPath: (path: string) => void;
  setCompactProjectTabs: (compact: boolean) => void;
  setDimInactiveProjects: (dim: boolean) => void;
  setCompressionArchiveOverwrite: (overwrite: boolean) => void;
  setCompressionMediaOverwrite: (overwrite: boolean) => void;
  setTerminalShell: (shell: TerminalShell) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultModel: "claude-sonnet-4-20250514",
      sidebarWidth: 256,
      sidebarPosition: "right",
      theme: "dark",
      fontSize: 14,
      appFont: "jetbrains-mono",
      editorTheme: "github-dark",
      editorFontSize: 14,
      editorWordWrap: true,
      editorMinimap: true,
      markdownDefaultView: "preview",
      defaultBrowsePath: "",
      customMusicPath: "",
      compactProjectTabs: false,
      dimInactiveProjects: false,
      compressionArchiveOverwrite: false,
      compressionMediaOverwrite: false,
      terminalShell: "system",

      setDefaultModel: (model: ClaudeModel) => {
        set({ defaultModel: model });
      },

      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: width });
      },

      setSidebarPosition: (sidebarPosition: SidebarPosition) => {
        set({ sidebarPosition });
      },

      setFontSize: (size: number) => {
        set({ fontSize: size });
      },

      setAppFont: (appFont: AppFont) => {
        set({ appFont });
      },

      setEditorTheme: (editorTheme: EditorTheme) => {
        set({ editorTheme });
      },

      setEditorFontSize: (editorFontSize: number) => {
        set({ editorFontSize });
      },

      setEditorWordWrap: (editorWordWrap: boolean) => {
        set({ editorWordWrap });
      },

      setEditorMinimap: (editorMinimap: boolean) => {
        set({ editorMinimap });
      },

      setMarkdownDefaultView: (markdownDefaultView: MarkdownViewMode) => {
        set({ markdownDefaultView });
      },

      setDefaultBrowsePath: (defaultBrowsePath: string) => {
        set({ defaultBrowsePath });
      },

      setCustomMusicPath: (customMusicPath: string) => {
        set({ customMusicPath });
      },

      setCompactProjectTabs: (compactProjectTabs: boolean) => {
        set({ compactProjectTabs });
      },

      setDimInactiveProjects: (dimInactiveProjects: boolean) => {
        set({ dimInactiveProjects });
      },

      setCompressionArchiveOverwrite: (compressionArchiveOverwrite: boolean) => {
        set({ compressionArchiveOverwrite });
      },

      setCompressionMediaOverwrite: (compressionMediaOverwrite: boolean) => {
        set({ compressionMediaOverwrite });
      },

      setTerminalShell: (terminalShell: TerminalShell) => {
        set({ terminalShell });
      },
    }),
    {
      name: "wynter-code-settings",
    }
  )
);
