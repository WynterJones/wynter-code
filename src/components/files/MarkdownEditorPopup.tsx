import { useState, useEffect, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Save, RotateCcw, Eye, Code, Columns } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip, Badge } from "@/components/ui";
import { useSettingsStore } from "@/stores/settingsStore";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";

interface MarkdownEditorPopupProps {
  filePath: string;
  onClose: () => void;
  onSave?: (content: string) => void;
}

type ViewMode = "edit" | "preview" | "split";

export function MarkdownEditorPopup({
  filePath,
  onClose,
  onSave,
}: MarkdownEditorPopupProps) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { editorTheme, editorFontSize, editorWordWrap, markdownDefaultView } =
    useSettingsStore();

  const [viewMode, setViewMode] = useState<ViewMode>(markdownDefaultView);

  const fileName = filePath.split("/").pop() || filePath;

  const handleEditorMount = (_editor: unknown, monaco: Monaco) => {
    defineMonacoThemes(monaco);
  };

  useEffect(() => {
    async function loadFile() {
      try {
        setIsLoading(true);
        const fileContent = await invoke<string>("read_file_content", {
          path: filePath,
        });
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

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      const newContent = value || "";
      setContent(newContent);
      setHasChanges(newContent !== originalContent);
    },
    [originalContent]
  );

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    },
    [onClose, hasChanges]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-text-primary">
              {fileName}
            </span>
            <Badge variant="info" className="text-xs">
              Markdown
            </Badge>
            {hasChanges && (
              <Badge variant="warning" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1">
              <Tooltip content="Edit Only" side="bottom">
                <button
                  onClick={() => setViewMode("edit")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "edit"
                      ? "bg-bg-hover text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Code className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Split View" side="bottom">
                <button
                  onClick={() => setViewMode("split")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "split"
                      ? "bg-bg-hover text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Columns className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Preview Only" side="bottom">
                <button
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "preview"
                      ? "bg-bg-hover text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>

            <div className="w-px h-6 bg-border mx-2" />

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
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center w-full text-text-secondary">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center w-full text-accent-red">
              {error}
            </div>
          ) : (
            <>
              {/* Editor Panel */}
              {(viewMode === "edit" || viewMode === "split") && (
                <div
                  className={cn(
                    "h-full overflow-hidden",
                    viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"
                  )}
                >
                  <Editor
                    height="100%"
                    language="markdown"
                    value={content}
                    onChange={handleContentChange}
                    theme={editorTheme}
                    onMount={handleEditorMount}
                    options={{
                      fontSize: editorFontSize,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      minimap: { enabled: false },
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
                </div>
              )}

              {/* Preview Panel */}
              {(viewMode === "preview" || viewMode === "split") && (
                <div
                  className={cn(
                    "h-full overflow-auto p-6 bg-bg-tertiary",
                    viewMode === "split" ? "w-1/2" : "w-full"
                  )}
                >
                  <article className="markdown-preview max-w-[700px] mx-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </article>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <span className="font-mono">{filePath}</span>
          <div className="flex items-center gap-4">
            <span>Lines: {content.split("\n").length}</span>
            <span>Words: {content.split(/\s+/).filter(Boolean).length}</span>
            <span>Chars: {content.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
