import { X, Code, Info, FolderOpen, Keyboard, Music, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip, ScrollArea } from "@/components/ui";
import {
  useSettingsStore,
  EDITOR_THEMES,
  APP_FONTS,
  type EditorTheme,
  type MarkdownViewMode,
  type SidebarPosition,
  type AppFont,
} from "@/stores/settingsStore";
import { KEYBOARD_SHORTCUTS, formatShortcut, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";

interface SettingsPopupProps {
  onClose: () => void;
}

type SettingsTab = "general" | "editor" | "markdown" | "music" | "keyboard" | "about";

const APP_VERSION = "1.0.0";

export function SettingsPopup({ onClose }: SettingsPopupProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const {
    editorTheme,
    editorFontSize,
    editorWordWrap,
    editorMinimap,
    markdownDefaultView,
    defaultBrowsePath,
    customMusicPath,
    sidebarPosition,
    appFont,
    compactProjectTabs,
    dimInactiveProjects,
    setEditorTheme,
    setEditorFontSize,
    setEditorWordWrap,
    setEditorMinimap,
    setMarkdownDefaultView,
    setDefaultBrowsePath,
    setCustomMusicPath,
    setSidebarPosition,
    setAppFont,
    setCompactProjectTabs,
    setDimInactiveProjects,
  } = useSettingsStore();

  const tabs: { id: SettingsTab; label: string; icon: typeof Code }[] = [
    { id: "general", label: "General", icon: FolderOpen },
    { id: "editor", label: "Editor", icon: Code },
    { id: "markdown", label: "Markdown", icon: FileText },
    { id: "music", label: "Music", icon: Music },
    { id: "keyboard", label: "Keyboard", icon: Keyboard },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <span className="font-medium text-text-primary">Settings</span>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex flex-1 min-h-[400px] max-h-[70vh]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-bg-secondary p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1" scrollbarVisibility="visible">
            <div className="p-6">
              {activeTab === "general" && (
                <GeneralSettings
                  defaultBrowsePath={defaultBrowsePath}
                  onDefaultBrowsePathChange={setDefaultBrowsePath}
                  sidebarPosition={sidebarPosition}
                  onSidebarPositionChange={setSidebarPosition}
                  appFont={appFont}
                  onAppFontChange={setAppFont}
                  compactProjectTabs={compactProjectTabs}
                  onCompactProjectTabsChange={setCompactProjectTabs}
                  dimInactiveProjects={dimInactiveProjects}
                  onDimInactiveProjectsChange={setDimInactiveProjects}
                />
              )}
              {activeTab === "editor" && (
                <EditorSettings
                  theme={editorTheme}
                  fontSize={editorFontSize}
                  wordWrap={editorWordWrap}
                  minimap={editorMinimap}
                  onThemeChange={setEditorTheme}
                  onFontSizeChange={setEditorFontSize}
                  onWordWrapChange={setEditorWordWrap}
                  onMinimapChange={setEditorMinimap}
                />
              )}
              {activeTab === "markdown" && (
                <MarkdownSettings
                  markdownDefaultView={markdownDefaultView}
                  onMarkdownDefaultViewChange={setMarkdownDefaultView}
                />
              )}
              {activeTab === "music" && (
                <MusicSettings
                  customMusicPath={customMusicPath}
                  onCustomMusicPathChange={setCustomMusicPath}
                />
              )}
              {activeTab === "keyboard" && <KeyboardShortcutsSection />}
              {activeTab === "about" && <AboutSection />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

interface EditorSettingsProps {
  theme: EditorTheme;
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  onThemeChange: (theme: EditorTheme) => void;
  onFontSizeChange: (size: number) => void;
  onWordWrapChange: (wrap: boolean) => void;
  onMinimapChange: (show: boolean) => void;
}

const MARKDOWN_VIEW_OPTIONS: { id: MarkdownViewMode; name: string }[] = [
  { id: "preview", name: "Preview" },
  { id: "split", name: "Split View" },
  { id: "edit", name: "Code" },
];

function EditorSettings({
  theme,
  fontSize,
  wordWrap,
  minimap,
  onThemeChange,
  onFontSizeChange,
  onWordWrapChange,
  onMinimapChange,
}: EditorSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Editor Settings
      </h2>

      {/* Theme Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">Theme</label>
        <p className="text-xs text-text-secondary mb-2">
          Choose a color theme for the code editor
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EDITOR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={cn(
                "px-4 py-3 rounded-lg border text-sm text-left transition-all",
                theme === t.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2",
                    theme === t.id ? "border-accent bg-accent" : "border-border"
                  )}
                />
                {t.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Font Size
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Adjust the editor font size (10-24px)
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={24}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-sm text-text-primary w-12 text-right font-mono">
            {fontSize}px
          </span>
        </div>
      </div>

      {/* Word Wrap */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-text-primary">
            Word Wrap
          </label>
          <p className="text-xs text-text-secondary">
            Wrap long lines instead of horizontal scrolling
          </p>
        </div>
        <button
          onClick={() => onWordWrapChange(!wordWrap)}
          className={cn(
            "w-11 h-6 rounded-full transition-colors relative",
            wordWrap ? "bg-accent" : "bg-bg-hover"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
              wordWrap ? "left-5" : "left-0.5"
            )}
          />
        </button>
      </div>

      {/* Minimap */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-text-primary">
            Minimap
          </label>
          <p className="text-xs text-text-secondary">
            Show code minimap on the right side
          </p>
        </div>
        <button
          onClick={() => onMinimapChange(!minimap)}
          className={cn(
            "w-11 h-6 rounded-full transition-colors relative",
            minimap ? "bg-accent" : "bg-bg-hover"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
              minimap ? "left-5" : "left-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}

interface MarkdownSettingsProps {
  markdownDefaultView: MarkdownViewMode;
  onMarkdownDefaultViewChange: (mode: MarkdownViewMode) => void;
}

function MarkdownSettings({
  markdownDefaultView,
  onMarkdownDefaultViewChange,
}: MarkdownSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Markdown Settings
      </h2>

      {/* Markdown Default View */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Default View
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Choose the default view mode when opening markdown files
        </p>
        <div className="flex gap-2">
          {MARKDOWN_VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onMarkdownDefaultViewChange(option.id)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-sm transition-all",
                markdownDefaultView === option.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
              )}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  defaultBrowsePath: string;
  onDefaultBrowsePathChange: (path: string) => void;
  sidebarPosition: SidebarPosition;
  onSidebarPositionChange: (position: SidebarPosition) => void;
  appFont: AppFont;
  onAppFontChange: (font: AppFont) => void;
  compactProjectTabs: boolean;
  onCompactProjectTabsChange: (compact: boolean) => void;
  dimInactiveProjects: boolean;
  onDimInactiveProjectsChange: (dim: boolean) => void;
}

const SIDEBAR_POSITION_OPTIONS: { id: SidebarPosition; name: string }[] = [
  { id: "left", name: "Left" },
  { id: "right", name: "Right" },
];

function GeneralSettings({
  defaultBrowsePath,
  onDefaultBrowsePathChange,
  sidebarPosition,
  onSidebarPositionChange,
  appFont,
  onAppFontChange,
  compactProjectTabs,
  onCompactProjectTabsChange,
  dimInactiveProjects,
  onDimInactiveProjectsChange,
}: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        General Settings
      </h2>

      {/* Project Tabs Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-text-primary border-b border-border pb-2">
          Project Tabs
        </h3>

        {/* Compact Project Tabs */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Compact Tabs
            </label>
            <p className="text-xs text-text-secondary">
              Use smaller, more compact project tabs
            </p>
          </div>
          <button
            onClick={() => onCompactProjectTabsChange(!compactProjectTabs)}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative",
              compactProjectTabs ? "bg-accent" : "bg-bg-hover"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                compactProjectTabs ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>

        {/* Dim Inactive Projects */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Dim Inactive Projects
            </label>
            <p className="text-xs text-text-secondary">
              Gray out inactive project tabs to reduce visual clutter
            </p>
          </div>
          <button
            onClick={() => onDimInactiveProjectsChange(!dimInactiveProjects)}
            className={cn(
              "w-11 h-6 rounded-full transition-colors relative",
              dimInactiveProjects ? "bg-accent" : "bg-bg-hover"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                dimInactiveProjects ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>

        <p className="text-xs text-text-secondary italic pt-1">
          Tip: Right-click any project tab to change its icon or color
        </p>
      </div>

      {/* App Font */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Font
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Choose a font for the entire application
        </p>
        <div className="grid grid-cols-2 gap-2">
          {APP_FONTS.map((font) => (
            <button
              key={font.id}
              onClick={() => onAppFontChange(font.id)}
              className={cn(
                "px-4 py-3 rounded-lg border text-sm text-left transition-all",
                appFont === font.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
              )}
              style={{ fontFamily: font.family }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2",
                    appFont === font.id ? "border-accent bg-accent" : "border-border"
                  )}
                />
                {font.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Position */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Sidebar Position
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Choose which side of the screen the sidebar appears on
        </p>
        <div className="flex gap-2">
          {SIDEBAR_POSITION_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onSidebarPositionChange(option.id)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-sm transition-all",
                sidebarPosition === option.id
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
              )}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      {/* Default Browse Path */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Default Browse Path
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Set a default starting directory for the file browser. Leave empty to use the home directory.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={defaultBrowsePath}
            onChange={(e) => onDefaultBrowsePathChange(e.target.value)}
            placeholder="e.g., /Users/you/Projects"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent"
          />
          {defaultBrowsePath && (
            <button
              onClick={() => onDefaultBrowsePathChange("")}
              className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MusicSettingsProps {
  customMusicPath: string;
  onCustomMusicPathChange: (path: string) => void;
}

interface AudioFile {
  name: string;
  file: string;
  path: string;
}

function MusicSettings({
  customMusicPath,
  onCustomMusicPathChange,
}: MusicSettingsProps) {
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [trackCount, setTrackCount] = useState<number | null>(null);

  useEffect(() => {
    if (!customMusicPath) {
      setTrackCount(null);
      return;
    }

    invoke<AudioFile[]>("scan_music_folder", { folderPath: customMusicPath })
      .then((files) => setTrackCount(files.length))
      .catch(() => setTrackCount(0));
  }, [customMusicPath]);

  const handleSelectFolder = (path: string) => {
    onCustomMusicPathChange(path);
    setShowFileBrowser(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Music Settings
      </h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Custom Music Folder
        </label>
        <p className="text-xs text-text-secondary mb-2">
          Select a folder containing mp3 files to use for meditation music.
          This will replace the built-in tracks.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={customMusicPath}
            readOnly
            placeholder="No custom folder selected (using built-in tracks)"
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-secondary text-sm cursor-pointer"
            onClick={() => setShowFileBrowser(true)}
          />
          <button
            onClick={() => setShowFileBrowser(true)}
            className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
          >
            Browse
          </button>
          {customMusicPath && (
            <button
              onClick={() => onCustomMusicPathChange("")}
              className="px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {customMusicPath && trackCount !== null && (
          <p
            className={cn(
              "text-xs mt-2",
              trackCount > 0 ? "text-green-400" : "text-amber-400"
            )}
          >
            {trackCount > 0
              ? `Found ${trackCount} mp3 file${trackCount === 1 ? "" : "s"}`
              : "No mp3 files found in this folder"}
          </p>
        )}
      </div>

      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          How it works
        </h3>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>- Scans the selected folder for .mp3 files</li>
          <li>
            - Filenames are converted to display names (hyphens/underscores
            become spaces)
          </li>
          <li>- Tracks play in random order, just like built-in music</li>
          <li>- Clear the path to return to built-in tracks</li>
        </ul>
      </div>

      {showFileBrowser && (
        <FileBrowserPopup
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
          mode="selectProject"
          selectButtonLabel="Select Folder"
          onSelectProject={handleSelectFolder}
        />
      )}
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <img
          src="/icons/icon1.png"
          alt="Wynter Code"
          className="w-20 h-20 mx-auto mb-4 rounded-2xl"
        />
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Wynter Code
        </h1>
        <p className="text-text-secondary">Version {APP_VERSION}</p>
      </div>

      <div className="space-y-4 text-sm">
        <div className="p-4 rounded-lg bg-bg-secondary border border-border">
          <h3 className="font-medium text-text-primary mb-2">About</h3>
          <p className="text-text-secondary leading-relaxed">
            Wynter Code is a desktop application that provides a beautiful GUI
            wrapper around Claude Code CLI. It features multi-project tabs,
            multiple sessions per project, file browsing, and a modern dark
            theme.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-bg-secondary border border-border">
          <h3 className="font-medium text-text-primary mb-2">Built With</h3>
          <ul className="text-text-secondary space-y-1">
            <li>Tauri 2.0 (Rust + Web)</li>
            <li>React + TypeScript</li>
            <li>Tailwind CSS</li>
            <li>Monaco Editor</li>
            <li>Claude Code CLI</li>
          </ul>
        </div>

        <div className="p-4 rounded-lg bg-bg-secondary border border-border">
          <h3 className="font-medium text-text-primary mb-2">License</h3>
          <p className="text-text-secondary">MIT License</p>
        </div>
      </div>

      <div className="text-center text-xs text-text-secondary pt-4">
        Made with care
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<KeyboardShortcut["category"], string> = {
  navigation: "Navigation",
  sessions: "Sessions",
  ui: "Interface",
  editing: "Editing",
};

const CATEGORY_ORDER: KeyboardShortcut["category"][] = ["navigation", "sessions", "ui", "editing"];

function KeyboardShortcutsSection() {
  // Group shortcuts by category
  const groupedShortcuts = CATEGORY_ORDER.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    shortcuts: KEYBOARD_SHORTCUTS.filter(s => s.category === category),
  })).filter(g => g.shortcuts.length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Keyboard Shortcuts
      </h2>

      <p className="text-sm text-text-secondary mb-4">
        Use these keyboard shortcuts to navigate and control the application quickly.
      </p>

      <div className="space-y-6">
        {groupedShortcuts.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
              {group.label}
            </h3>
            <div className="space-y-1 bg-bg-secondary rounded-lg border border-border overflow-hidden">
              {group.shortcuts.map((shortcut, index) => (
                <div
                  key={`${shortcut.action}-${index}`}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-4",
                    index !== group.shortcuts.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="text-sm text-text-primary">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-bg-primary border border-border rounded text-text-secondary">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-text-secondary">
          Tip: Press <kbd className="px-1.5 py-0.5 mx-1 text-xs font-mono bg-bg-secondary border border-border rounded">⌘/</kbd> anywhere to quickly view all shortcuts.
        </p>
      </div>
    </div>
  );
}
