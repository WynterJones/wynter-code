import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClaudeModel, AIProvider, CodexModel, GeminiModel } from "@/types";
import type { SidebarTab } from "@/types/file";
import type {
  AudioSourceType,
  NightrideStation,
  RadioBrowserFavorite,
} from "@/types/radio";
import { NIGHTRIDE_STATIONS } from "@/components/meditation/radioStations";

export type EditorTheme =
  | "one-dark"
  | "dracula"
  | "vs-dark"
  | "github-dark"
  | "monokai"
  | "catppuccin-ultrathin";

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

// Lightcast hotkey options
export type LightcastHotkey = "alt-space" | "cmd-space" | "ctrl-space" | "cmd-shift-space" | "alt-shift-space";

// Claude subscription plan types
export type ClaudeSubscriptionPlan = "pro" | "max-100" | "max-200";

// Vibrancy material types (macOS NSVisualEffectMaterial)
export type VibrancyMaterial =
  | "sidebar"
  | "window"
  | "content"
  | "under-window"
  | "hud"
  | "popover"
  | "menu"
  | "titlebar"
  | "dark"
  | "ultra-dark"
  | "acrylic"; // Windows only

export const VIBRANCY_MATERIALS: { id: VibrancyMaterial; name: string; description: string }[] = [
  { id: "sidebar", name: "Sidebar", description: "Default sidebar appearance" },
  { id: "window", name: "Window", description: "Standard window background" },
  { id: "content", name: "Content", description: "Content background" },
  { id: "under-window", name: "Under Window", description: "Behind window content" },
  { id: "hud", name: "HUD", description: "Heads-up display style" },
  { id: "popover", name: "Popover", description: "Popover appearance" },
  { id: "menu", name: "Menu", description: "Menu bar style" },
  { id: "titlebar", name: "Titlebar", description: "Title bar appearance" },
  { id: "dark", name: "Dark", description: "Dark vibrant appearance" },
  { id: "ultra-dark", name: "Ultra Dark", description: "Very dark appearance" },
];

export const LIGHTCAST_HOTKEYS: { id: LightcastHotkey; name: string; display: string }[] = [
  { id: "alt-space", name: "Option + Space", display: "⌥ Space" },
  { id: "cmd-space", name: "Command + Space", display: "⌘ Space" },
  { id: "ctrl-space", name: "Control + Space", display: "⌃ Space" },
  { id: "cmd-shift-space", name: "Command + Shift + Space", display: "⌘⇧ Space" },
  { id: "alt-shift-space", name: "Option + Shift + Space", display: "⌥⇧ Space" },
];

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
  { id: "catppuccin-ultrathin", name: "Catppuccin Ultrathin" },
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
  sidebarCollapsed: boolean;
  sidebarTabOrder: SidebarTab[];
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
  terminalFontSize: number;
  terminalCursorBlink: boolean;
  useMultiPanelLayout: boolean;

  // Claude safety settings
  claudeSafeMode: boolean; // Prevents bypassPermissions, restricts to project dir

  // AI Provider settings
  defaultProvider: AIProvider;
  defaultCodexModel: CodexModel;
  defaultGeminiModel: GeminiModel;
  installedProviders: AIProvider[];

  // Avatar
  userAvatar: string | null;

  // Radio settings
  audioSourceType: AudioSourceType;
  nightrideStation: NightrideStation;
  radioBrowserFavorites: RadioBrowserFavorite[];
  currentRadioBrowserStation: RadioBrowserFavorite | null;

  // Lightcast settings
  lightcastHotkey: LightcastHotkey;
  lightcastEnabled: boolean;
  launchAtStartup: boolean;

  // Claude usage limits settings
  claudeSubscriptionPlan: ClaudeSubscriptionPlan;

  // Farmwork settings
  autoOpenFarmworkMiniPlayer: boolean;

  // Vibrancy settings
  vibrancyEnabled: boolean;
  vibrancyDarkness: number; // 0.0 to 1.0 - controls dark overlay

  setDefaultModel: (model: ClaudeModel) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarTabOrder: (order: SidebarTab[]) => void;
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
  setTerminalFontSize: (size: number) => void;
  setTerminalCursorBlink: (blink: boolean) => void;
  setUseMultiPanelLayout: (use: boolean) => void;
  setUserAvatar: (avatar: string | null) => void;
  setClaudeSafeMode: (enabled: boolean) => void;

  // AI Provider setters
  setDefaultProvider: (provider: AIProvider) => void;
  setDefaultCodexModel: (model: CodexModel) => void;
  setDefaultGeminiModel: (model: GeminiModel) => void;
  setInstalledProviders: (providers: AIProvider[]) => void;

  // Radio setters
  setAudioSourceType: (type: AudioSourceType) => void;
  setNightrideStation: (station: NightrideStation) => void;
  nextNightrideStation: () => void;
  prevNightrideStation: () => void;
  addRadioBrowserFavorite: (station: RadioBrowserFavorite) => void;
  removeRadioBrowserFavorite: (stationuuid: string) => void;
  setCurrentRadioBrowserStation: (station: RadioBrowserFavorite | null) => void;

  // Lightcast setters
  setLightcastHotkey: (hotkey: LightcastHotkey) => void;
  setLightcastEnabled: (enabled: boolean) => void;
  setLaunchAtStartup: (enabled: boolean) => void;

  // Claude limits setter
  setClaudeSubscriptionPlan: (plan: ClaudeSubscriptionPlan) => void;

  // Farmwork setters
  setAutoOpenFarmworkMiniPlayer: (enabled: boolean) => void;

  // Vibrancy setters
  setVibrancyEnabled: (enabled: boolean) => void;
  setVibrancyDarkness: (darkness: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultModel: "claude-sonnet-4-20250514",
      sidebarWidth: 256,
      sidebarPosition: "right",
      sidebarCollapsed: false,
      sidebarTabOrder: ["files", "modules", "package", "git", "docs", "info"],
      theme: "dark",
      fontSize: 14,
      appFont: "jetbrains-mono",
      editorTheme: "catppuccin-ultrathin",
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
      terminalFontSize: 13,
      terminalCursorBlink: true,
      useMultiPanelLayout: false,
      userAvatar: null,
      claudeSafeMode: true, // Enabled by default for safety

      // AI Provider defaults
      defaultProvider: "claude",
      defaultCodexModel: "gpt-5.2-codex",
      defaultGeminiModel: "gemini-2.5-flash",
      installedProviders: ["claude"], // Will be updated on system check

      // Radio defaults
      audioSourceType: "nightride",
      nightrideStation: "chillsynth",
      radioBrowserFavorites: [],
      currentRadioBrowserStation: null,

      // Lightcast defaults
      lightcastHotkey: "alt-space",
      lightcastEnabled: true,
      launchAtStartup: false,

      // Claude limits defaults
      claudeSubscriptionPlan: "pro",

      // Farmwork defaults
      autoOpenFarmworkMiniPlayer: false,

      // Vibrancy defaults
      vibrancyEnabled: true,
      vibrancyDarkness: 0.65,

      setDefaultModel: (model: ClaudeModel) => {
        set({ defaultModel: model });
      },

      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: width });
      },

      setSidebarPosition: (sidebarPosition: SidebarPosition) => {
        set({ sidebarPosition });
      },

      setSidebarCollapsed: (sidebarCollapsed: boolean) => {
        set({ sidebarCollapsed });
      },

      setSidebarTabOrder: (sidebarTabOrder: SidebarTab[]) => {
        set({ sidebarTabOrder });
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

      setTerminalFontSize: (terminalFontSize: number) => {
        set({ terminalFontSize });
      },

      setTerminalCursorBlink: (terminalCursorBlink: boolean) => {
        set({ terminalCursorBlink });
      },

      setUseMultiPanelLayout: (useMultiPanelLayout: boolean) => {
        set({ useMultiPanelLayout });
      },

      setUserAvatar: (userAvatar: string | null) => {
        set({ userAvatar });
      },

      setClaudeSafeMode: (claudeSafeMode: boolean) => {
        set({ claudeSafeMode });
      },

      // AI Provider setters
      setDefaultProvider: (defaultProvider: AIProvider) => {
        set({ defaultProvider });
      },

      setDefaultCodexModel: (defaultCodexModel: CodexModel) => {
        set({ defaultCodexModel });
      },

      setDefaultGeminiModel: (defaultGeminiModel: GeminiModel) => {
        set({ defaultGeminiModel });
      },

      setInstalledProviders: (installedProviders: AIProvider[]) => {
        set({ installedProviders });
      },

      // Radio setters
      setAudioSourceType: (audioSourceType: AudioSourceType) => {
        set({ audioSourceType });
      },

      setNightrideStation: (nightrideStation: NightrideStation) => {
        set({ nightrideStation });
      },

      nextNightrideStation: () => {
        set((state) => {
          const currentIndex = NIGHTRIDE_STATIONS.findIndex(s => s.id === state.nightrideStation);
          const nextIndex = (currentIndex + 1) % NIGHTRIDE_STATIONS.length;
          return { nightrideStation: NIGHTRIDE_STATIONS[nextIndex].id as NightrideStation };
        });
      },

      prevNightrideStation: () => {
        set((state) => {
          const currentIndex = NIGHTRIDE_STATIONS.findIndex(s => s.id === state.nightrideStation);
          const prevIndex = (currentIndex - 1 + NIGHTRIDE_STATIONS.length) % NIGHTRIDE_STATIONS.length;
          return { nightrideStation: NIGHTRIDE_STATIONS[prevIndex].id as NightrideStation };
        });
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

      // Lightcast setters
      setLightcastHotkey: (lightcastHotkey: LightcastHotkey) => {
        set({ lightcastHotkey });
      },

      setLightcastEnabled: (lightcastEnabled: boolean) => {
        set({ lightcastEnabled });
      },

      setLaunchAtStartup: (launchAtStartup: boolean) => {
        set({ launchAtStartup });
      },

      setClaudeSubscriptionPlan: (claudeSubscriptionPlan: ClaudeSubscriptionPlan) => {
        set({ claudeSubscriptionPlan });
      },

      // Farmwork setters
      setAutoOpenFarmworkMiniPlayer: (autoOpenFarmworkMiniPlayer: boolean) => {
        set({ autoOpenFarmworkMiniPlayer });
      },

      // Vibrancy setters
      setVibrancyEnabled: (vibrancyEnabled: boolean) => {
        set({ vibrancyEnabled });
      },

      setVibrancyDarkness: (vibrancyDarkness: number) => {
        set({ vibrancyDarkness });
      },
    }),
    {
      name: "wynter-code-settings",
    }
  )
);
