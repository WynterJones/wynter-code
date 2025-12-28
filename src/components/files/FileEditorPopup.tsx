import { useState, useEffect, useCallback, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { X, Save, RotateCcw, Minus, Loader2, FileCode, Settings, Plus, MinusIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Tooltip, Badge } from "@/components/ui";
import { useSettingsStore } from "@/stores/settingsStore";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";
import { SettingsPopup } from "@/components/settings/SettingsPopup";

type MonacoEditor = Parameters<OnMount>[0];

interface FileEditorPopupProps {
  filePath: string;
  initialLine?: number;
  onClose: () => void;
  onSave?: (content: string) => void;
  onMinimize?: () => void;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    toml: "toml",
  };
  return languageMap[ext || ""] || "plaintext";
}

export function FileEditorPopup({ filePath, initialLine, onClose, onSave, onMinimize }: FileEditorPopupProps) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<MonacoEditor | null>(null);

  const { editorTheme, editorFontSize, editorWordWrap, editorMinimap, setEditorFontSize } =
    useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);

  const fileName = filePath.split("/").pop() || filePath;
  const language = getLanguageFromPath(filePath);

  // Define themes and disable diagnostics BEFORE mount to prevent white flash
  const handleEditorWillMount = (monaco: Monaco) => {
    defineMonacoThemes(monaco);
    // Disable all diagnostics/error checking
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
  };

  // Store editor ref and scroll to initial line
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    if (initialLine && initialLine > 0) {
      setTimeout(() => {
        editor.revealLineInCenter(initialLine);
        editor.setPosition({ lineNumber: initialLine, column: 1 });
        editor.focus();
      }, 100);
    }
  };

  useEffect(() => {
    async function loadFile() {
      try {
        setIsLoading(true);
        const fileContent = await invoke<string>("read_file_content", { path: filePath });
        setContent(fileContent);
        setOriginalContent(fileContent);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setIsLoading(false);
      }
    }
    loadFile();
  }, [filePath]);

  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || "";
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  }, [originalContent]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      await invoke("write_file_content", { path: filePath, content });
      setOriginalContent(content);
      setHasChanges(false);
      if (onSave) {
        onSave(content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  }, [filePath, content, onSave]);

  const handleReset = () => {
    setContent(originalContent);
    setHasChanges(false);
  };

  const handleZoomIn = useCallback(() => {
    setEditorFontSize(Math.min(editorFontSize + 2, 32));
  }, [editorFontSize, setEditorFontSize]);

  const handleZoomOut = useCallback(() => {
    setEditorFontSize(Math.max(editorFontSize - 2, 8));
  }, [editorFontSize, setEditorFontSize]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (hasChanges) {
        handleSave();
      }
    }
    // Zoom in/out with Ctrl/Cmd + / -
    if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      handleZoomIn();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "-") {
      e.preventDefault();
      handleZoomOut();
    }
  }, [onClose, hasChanges, handleSave, handleZoomIn, handleZoomOut]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-text-primary">{fileName}</span>
            <Badge variant="info" className="text-xs">{language}</Badge>
            {hasChanges && (
              <Badge variant="warning" className="text-xs">Unsaved</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mr-2 border-r border-border pr-2">
              <Tooltip content="Zoom Out (⌘-)" side="bottom">
                <IconButton size="sm" onClick={handleZoomOut}>
                  <MinusIcon className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
              <span className="text-xs text-text-secondary min-w-[32px] text-center font-mono">
                {editorFontSize}px
              </span>
              <Tooltip content="Zoom In (⌘+)" side="bottom">
                <IconButton size="sm" onClick={handleZoomIn}>
                  <Plus className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </div>
            {hasChanges && (
              <>
                <Tooltip content="Reset Changes" side="bottom">
                  <IconButton size="sm" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Save (⌘S)" side="bottom">
                  <IconButton
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-accent-green hover:text-accent-green"
                  >
                    <Save className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip content="Editor Settings" side="bottom">
              <IconButton size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            {onMinimize && (
              <Tooltip content="Minimize" side="bottom">
                <IconButton size="sm" onClick={onMinimize}>
                  <Minus className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 bg-bg-tertiary">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-bg-secondary border border-border">
                <FileCode className="w-8 h-8 text-text-tertiary" />
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading file...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-accent-red">
              {error}
            </div>
          ) : (
            <Editor
              height="100%"
              language={language}
              value={content}
              onChange={handleContentChange}
              theme={editorTheme || "github-dark"}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              loading={
                <div className="flex flex-col items-center justify-center h-full gap-4 bg-bg-tertiary">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-bg-secondary border border-border">
                    <FileCode className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initializing editor...</span>
                  </div>
                </div>
              }
              options={{
                fontSize: editorFontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: editorMinimap },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: editorWordWrap ? "on" : "off",
                lineNumbers: "on",
                renderLineHighlight: "line",
                padding: { top: 16, bottom: 16 },
                cursorBlinking: "smooth",
                smoothScrolling: true,
                renderValidationDecorations: "off",
                occurrencesHighlight: "off",
                guides: {
                  indentation: false,
                  bracketPairs: false,
                  highlightActiveIndentation: false,
                },
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <span className="font-mono">{filePath}</span>
          <div className="flex items-center gap-4">
            <span>Lines: {content.split("\n").length}</span>
            <span>Chars: {content.length}</span>
          </div>
        </div>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <SettingsPopup
          onClose={() => setShowSettings(false)}
          initialTab="editor"
        />
      )}
    </div>
  );
}
