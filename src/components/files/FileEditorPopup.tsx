import { useState, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { X, Save, RotateCcw, Minus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Tooltip, Badge } from "@/components/ui";
import { useSettingsStore } from "@/stores/settingsStore";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";

interface FileEditorPopupProps {
  filePath: string;
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

export function FileEditorPopup({ filePath, onClose, onSave, onMinimize }: FileEditorPopupProps) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { editorTheme, editorFontSize, editorWordWrap, editorMinimap } =
    useSettingsStore();

  const fileName = filePath.split("/").pop() || filePath;
  const language = getLanguageFromPath(filePath);

  // Define themes BEFORE mount to prevent white flash
  const handleEditorWillMount = (monaco: Monaco) => {
    defineMonacoThemes(monaco);
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

  const handleSave = async () => {
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
  };

  const handleReset = () => {
    setContent(originalContent);
    setHasChanges(false);
  };

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
  }, [onClose, hasChanges]);

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
            <div className="flex items-center justify-center h-full text-text-secondary">
              Loading...
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
              loading={
                <div className="flex items-center justify-center h-full bg-bg-tertiary text-text-secondary">
                  Loading editor...
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
    </div>
  );
}
