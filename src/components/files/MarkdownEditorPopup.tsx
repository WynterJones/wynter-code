import { useState, useEffect, useCallback, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Save, RotateCcw, Eye, Code, Columns, Minus, Search, ChevronUp, ChevronDown, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip, Badge, ScrollArea } from "@/components/ui";
import { useSettingsStore, MARKDOWN_MAX_WIDTHS } from "@/stores/settingsStore";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";

// Helper to toggle checkbox in markdown content
function toggleCheckboxAtIndex(content: string, checkboxIndex: number): string {
  const checkboxPattern = /- \[([ xX])\]/g;
  let currentIndex = 0;

  return content.replace(checkboxPattern, (match, checkState) => {
    if (currentIndex === checkboxIndex) {
      currentIndex++;
      // Toggle: if checked (x or X), uncheck; if unchecked (space), check
      const isChecked = checkState.toLowerCase() === 'x';
      return isChecked ? '- [ ]' : '- [x]';
    }
    currentIndex++;
    return match;
  });
}

interface MarkdownEditorPopupProps {
  filePath: string;
  onClose: () => void;
  onSave?: (content: string) => void;
  onMinimize?: () => void;
}

type ViewMode = "edit" | "preview" | "split";

export function MarkdownEditorPopup({
  filePath,
  onClose,
  onSave,
  onMinimize,
}: MarkdownEditorPopupProps) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFindBar, setShowFindBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const {
    editorTheme,
    editorFontSize,
    editorWordWrap,
    markdownDefaultView,
    markdownMaxWidth,
    markdownFontSize,
    setMarkdownMaxWidth,
    setMarkdownFontSize,
  } = useSettingsStore();

  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(markdownDefaultView);

  const fileName = filePath.split("/").pop() || filePath;
  const checkboxIndexRef = useRef(0);
  const previewRef = useRef<HTMLElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Handle checkbox toggle in preview
  const handleCheckboxToggle = useCallback((index: number) => {
    const newContent = toggleCheckboxAtIndex(content, index);
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  }, [content, originalContent]);

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

  // Find in preview functionality
  const highlightMatches = useCallback(() => {
    if (!previewRef.current) return;

    // Remove existing highlights
    const existingMarks = previewRef.current.querySelectorAll("mark.search-highlight");
    existingMarks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });

    if (!searchQuery.trim()) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }

    const walker = document.createTreeWalker(
      previewRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let count = 0;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || "";
      if (regex.test(text)) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        text.replace(regex, (match, _p1, offset) => {
          if (offset > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
          }
          const mark = document.createElement("mark");
          mark.className = "search-highlight bg-accent-yellow/40 rounded px-0.5";
          mark.textContent = match;
          mark.dataset.matchIndex = String(count);
          count++;
          fragment.appendChild(mark);
          lastIndex = offset + match.length;
          return match;
        });
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });

    setMatchCount(count);
    if (count > 0 && currentMatchIndex >= count) {
      setCurrentMatchIndex(0);
    }
  }, [searchQuery, currentMatchIndex]);

  const scrollToMatch = useCallback((index: number) => {
    if (!previewRef.current) return;
    const marks = previewRef.current.querySelectorAll("mark.search-highlight");
    marks.forEach((mark, i) => {
      if (i === index) {
        mark.classList.add("!bg-accent/60");
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        mark.classList.remove("!bg-accent/60");
      }
    });
  }, []);

  const goToNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matchCount;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(nextIndex);
  }, [currentMatchIndex, matchCount, scrollToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matchCount) % matchCount;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(prevIndex);
  }, [currentMatchIndex, matchCount, scrollToMatch]);

  useEffect(() => {
    if (showFindBar && searchQuery) {
      const timeout = setTimeout(() => {
        highlightMatches();
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery, showFindBar, highlightMatches]);

  useEffect(() => {
    if (showFindBar && matchCount > 0) {
      scrollToMatch(currentMatchIndex);
    }
  }, [currentMatchIndex, matchCount, showFindBar, scrollToMatch]);

  useEffect(() => {
    if (showFindBar && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
    }
  }, [showFindBar]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showFindBar) {
          setShowFindBar(false);
          setSearchQuery("");
        } else {
          onClose();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        if (viewMode === "preview" || viewMode === "split") {
          e.preventDefault();
          setShowFindBar(true);
        }
      }
    },
    [onClose, hasChanges, showFindBar, viewMode, handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close settings popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSettings]);

  // Get computed styles for markdown preview
  const maxWidthValue = MARKDOWN_MAX_WIDTHS.find(w => w.id === markdownMaxWidth)?.value || "700px";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-full h-full max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
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
              <div className="w-px h-4 bg-border/50 mx-0.5" />
              <div className="relative" ref={settingsRef}>
                <Tooltip content="Preview Settings" side="bottom">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      showSettings
                        ? "bg-bg-hover text-accent"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </Tooltip>
                {showSettings && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 p-4 space-y-4 dropdown-solid">
                    <div className="text-xs font-medium text-text-primary mb-3">Preview Settings</div>

                    {/* Max Width */}
                    <div className="space-y-1.5">
                      <label htmlFor="md-content-width" className="text-xs text-text-secondary">Content Width</label>
                      <select
                        id="md-content-width"
                        value={markdownMaxWidth}
                        onChange={(e) => setMarkdownMaxWidth(e.target.value as typeof markdownMaxWidth)}
                        className="w-full px-2 py-1.5 text-sm bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {MARKDOWN_MAX_WIDTHS.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <label htmlFor="md-font-size" className="text-xs text-text-secondary">Font Size: {markdownFontSize}px</label>
                      <input
                        id="md-font-size"
                        type="range"
                        min="12"
                        max="24"
                        value={markdownFontSize}
                        onChange={(e) => setMarkdownFontSize(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-px h-6 bg-border mx-2" />

            {hasChanges && (
              <>
                <Tooltip content="Reset Changes" side="bottom">
                  <IconButton size="sm" onClick={handleReset} aria-label="Reset changes">
                    <RotateCcw className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Save (⌘S)" side="bottom">
                  <IconButton
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-accent-green hover:text-accent-green"
                    aria-label="Save file"
                  >
                    <Save className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {onMinimize && (
              <Tooltip content="Minimize" side="bottom">
                <IconButton size="sm" onClick={onMinimize} aria-label="Minimize editor">
                  <Minus className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose} aria-label="Close editor">
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
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: editorWordWrap ? "on" : "off",
                      lineNumbers: "on",
                      renderLineHighlight: "line",
                      padding: { top: 16, bottom: 16 },
                      cursorBlinking: "smooth",
                      smoothScrolling: true,
                      renderValidationDecorations: "off",
                      guides: {
                        indentation: false,
                        bracketPairs: false,
                        highlightActiveIndentation: false,
                      },
                    }}
                  />
                </div>
              )}

              {/* Preview Panel */}
              {(viewMode === "preview" || viewMode === "split") && (
                <div
                  className={cn(
                    "h-full bg-bg-tertiary flex flex-col",
                    viewMode === "split" ? "w-1/2" : "w-full"
                  )}
                >
                  {/* Find Bar */}
                  {showFindBar && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-secondary">
                      <Search className="w-4 h-4 text-text-secondary" />
                      <input
                        ref={findInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (e.shiftKey) goToPrevMatch(); else goToNextMatch();
                          }
                          if (e.key === "Escape") {
                            setShowFindBar(false);
                            setSearchQuery("");
                          }
                        }}
                        placeholder="Find in preview..."
                        className="flex-1 px-2 py-1 text-sm bg-bg-tertiary border border-border rounded text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <span className="text-xs text-text-secondary min-w-[60px] text-center">
                        {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "No results"}
                      </span>
                      <button
                        onClick={goToPrevMatch}
                        disabled={matchCount === 0}
                        className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToNextMatch}
                        disabled={matchCount === 0}
                        className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowFindBar(false);
                          setSearchQuery("");
                        }}
                        className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <ScrollArea className="flex-1">
                    <article
                      ref={previewRef}
                      className="markdown-preview mx-auto p-6"
                      style={{
                        maxWidth: maxWidthValue,
                        fontSize: `${markdownFontSize}px`,
                      }}
                    >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        input: ({ type, checked, ...props }) => {
                          if (type === "checkbox") {
                            const index = checkboxIndexRef.current++;
                            return (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleCheckboxToggle(index)}
                                className="cursor-pointer accent-accent w-4 h-4 mr-2 rounded"
                                {...props}
                              />
                            );
                          }
                          return <input type={type} checked={checked} {...props} />;
                        },
                        // Reset checkbox index on each list to maintain correct ordering
                        ul: ({ children, className }) => {
                          // Check if this is a task list
                          const isTaskList = className?.includes('contains-task-list');
                          return (
                            <ul className={cn(
                              isTaskList ? "list-none pl-0 space-y-1" : "list-disc list-inside",
                              "mb-3 space-y-1 text-sm text-text-primary"
                            )}>
                              {children}
                            </ul>
                          );
                        },
                        li: ({ children, className }) => {
                          const isTask = className?.includes('task-list-item');
                          return (
                            <li className={cn(
                              "text-sm text-text-primary",
                              isTask && "flex items-start gap-0"
                            )}>
                              {children}
                            </li>
                          );
                        },
                      }}
                    >
                      {(() => {
                        // Reset checkbox index before each render
                        checkboxIndexRef.current = 0;
                        return content;
                      })()}
                    </ReactMarkdown>
                    </article>
                  </ScrollArea>
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
