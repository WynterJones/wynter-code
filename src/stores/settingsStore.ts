import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClaudeModel } from "@/types";
import type {
  AudioSourceType,
  NightrideStation,
  RadioBrowserFavorite,
} from "@/types/radio";

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

export type MarkdownMaxWidth = "700" | "900" | "1200" | "full";

export const MARKDOWN_MAX_WIDTHS: { id: MarkdownMaxWidth; name: string; value: string }[] = [
  { id: "700", name: "Narrow (700px)", value: "700px" },
  { id: "900", name: "Medium (900px)", value: "900px" },
  { id: "1200", name: "Wide (1200px)", value: "1200px" },
  { id: "full", name: "Full Width", value: "100%" },
];

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
  markdownMaxWidth: MarkdownMaxWidth;
  markdownFontSize: number;
  defaultBrowsePath: string;
  customMusicPath: string;
  compactProjectTabs: boolean;
  dimInactiveProjects: boolean;
  compressionArchiveOverwrite: boolean;
  compressionMediaOverwrite: boolean;
  terminalShell: TerminalShell;
  useMultiPanelLayout: boolean;

  // Avatar
  userAvatar: string | null;

  // Radio settings
  audioSourceType: AudioSourceType;
  nightrideStation: NightrideStation;
  radioBrowserFavorites: RadioBrowserFavorite[];
  currentRadioBrowserStation: RadioBrowserFavorite | null;

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
  setMarkdownMaxWidth: (width: MarkdownMaxWidth) => void;
  setMarkdownFontSize: (size: number) => void;
  setDefaultBrowsePath: (path: string) => void;
  setCustomMusicPath: (path: string) => void;
  setCompactProjectTabs: (compact: boolean) => void;
  setDimInactiveProjects: (dim: boolean) => void;
  setCompressionArchiveOverwrite: (overwrite: boolean) => void;
  setCompressionMediaOverwrite: (overwrite: boolean) => void;
  setTerminalShell: (shell: TerminalShell) => void;
  setUseMultiPanelLayout: (use: boolean) => void;
  setUserAvatar: (avatar: string | null) => void;

  // Radio setters
  setAudioSourceType: (type: AudioSourceType) => void;
  setNightrideStation: (station: NightrideStation) => void;
  addRadioBrowserFavorite: (station: RadioBrowserFavorite) => void;
  removeRadioBrowserFavorite: (stationuuid: string) => void;
  setCurrentRadioBrowserStation: (station: RadioBrowserFavorite | null) => void;
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
      markdownMaxWidth: "700",
      markdownFontSize: 15,
      defaultBrowsePath: "",
      customMusicPath: "",
      compactProjectTabs: false,
      dimInactiveProjects: false,
      compressionArchiveOverwrite: false,
      compressionMediaOverwrite: false,
      terminalShell: "system",
      useMultiPanelLayout: false,
      userAvatar: null,

      // Radio defaults
      audioSourceType: "nightride",
      nightrideStation: "chillsynth",
      radioBrowserFavorites: [],
      currentRadioBrowserStation: null,

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

      setMarkdownMaxWidth: (markdownMaxWidth: MarkdownMaxWidth) => {
        set({ markdownMaxWidth });
      },

      setMarkdownFontSize: (markdownFontSize: number) => {
        set({ markdownFontSize });
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

      setUseMultiPanelLayout: (useMultiPanelLayout: boolean) => {
        set({ useMultiPanelLayout });
      },

      setUserAvatar: (userAvatar: string | null) => {
        set({ userAvatar });
      },

      // Radio setters
      setAudioSourceType: (audioSourceType: AudioSourceType) => {
        set({ audioSourceType });
      },

      setNightrideStation: (nightrideStation: NightrideStation) => {
        set({ nightrideStation });
      },

      addRadioBrowserFavorite: (station: RadioBrowserFavorite) => {
        set((state) => ({
          radioBrowserFavorites: [
            ...state.radioBrowserFavorites.filter(
              (s) => s.stationuuid !== station.stationuuid
            ),
            station,
          ],
        }));
      },

      removeRadioBrowserFavorite: (stationuuid: string) => {
        set((state) => ({
          radioBrowserFavorites: state.radioBrowserFavorites.filter(
            (s) => s.stationuuid !== stationuuid
          ),
        }));
      },

      setCurrentRadioBrowserStation: (
        currentRadioBrowserStation: RadioBrowserFavorite | null
      ) => {
        set({ currentRadioBrowserStation });
      },
    }),
    {
      name: "wynter-code-settings",
    }
  )
);
