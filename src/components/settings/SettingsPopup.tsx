import { X, Code, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import {
  useSettingsStore,
  EDITOR_THEMES,
  type EditorTheme,
  type MarkdownViewMode,
} from "@/stores/settingsStore";

interface SettingsPopupProps {
  onClose: () => void;
}

type SettingsTab = "editor" | "about";

const APP_VERSION = "1.0.0";

export function SettingsPopup({ onClose }: SettingsPopupProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("editor");

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
    setEditorTheme,
    setEditorFontSize,
    setEditorWordWrap,
    setEditorMinimap,
    setMarkdownDefaultView,
  } = useSettingsStore();

  const tabs: { id: SettingsTab; label: string; icon: typeof Code }[] = [
    { id: "editor", label: "Editor", icon: Code },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <span className="font-medium text-text-primary">Settings</span>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex flex-1 min-h-[400px]">
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
          <div className="flex-1 p-6 overflow-auto">
            {activeTab === "editor" && (
              <EditorSettings
                theme={editorTheme}
                fontSize={editorFontSize}
                wordWrap={editorWordWrap}
                minimap={editorMinimap}
                markdownDefaultView={markdownDefaultView}
                onThemeChange={setEditorTheme}
                onFontSizeChange={setEditorFontSize}
                onWordWrapChange={setEditorWordWrap}
                onMinimapChange={setEditorMinimap}
                onMarkdownDefaultViewChange={setMarkdownDefaultView}
              />
            )}
            {activeTab === "about" && <AboutSection />}
          </div>
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
  markdownDefaultView: MarkdownViewMode;
  onThemeChange: (theme: EditorTheme) => void;
  onFontSizeChange: (size: number) => void;
  onWordWrapChange: (wrap: boolean) => void;
  onMinimapChange: (show: boolean) => void;
  onMarkdownDefaultViewChange: (mode: MarkdownViewMode) => void;
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
  markdownDefaultView,
  onThemeChange,
  onFontSizeChange,
  onWordWrapChange,
  onMinimapChange,
  onMarkdownDefaultViewChange,
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

      {/* Markdown Default View */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Markdown Default View
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

function AboutSection() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-blue flex items-center justify-center">
          <Code className="w-10 h-10 text-white" />
        </div>
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
