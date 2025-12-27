import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Loader2, File, Eye, Code, Columns, Search, ChevronUp, ChevronDown, X, Save, RotateCcw, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import Editor, { type Monaco } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { defineMonacoThemes } from "@/hooks/useMonacoTheme";
import { useSettingsStore, MARKDOWN_MAX_WIDTHS } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { ScrollArea, Tooltip } from "@/components/ui";
import type { PanelContentProps } from "@/types/panel";

function toggleCheckboxAtIndex(content: string, checkboxIndex: number): string {
  const checkboxPattern = /- \[([ xX])\]/g;
  let currentIndex = 0;

  return content.replace(checkboxPattern, (match, checkState) => {
    if (currentIndex === checkboxIndex) {
      currentIndex++;
      const isChecked = checkState.toLowerCase() === 'x';
      return isChecked ? '- [ ]' : '- [x]';
    }
    currentIndex++;
    return match;
  });
}

type ViewMode = "edit" | "preview" | "split";

export function MarkdownViewerPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [content, setContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

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

  const [viewMode, setViewMode] = useState<ViewMode>(markdownDefaultView);

  const filePath = panel.filePath;
  const fileName = filePath?.split("/").pop() || "";
  const checkboxIndexRef = useRef(0);
  const previewRef = useRef<HTMLElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleEditorWillMount = (monaco: Monaco) => {
    defineMonacoThemes(monaco);
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
    if (!filePath) {
      setContent(null);
      return;
    }

    setLoading(true);
    setError(null);
    setContent(null);

    invoke<string>("read_file_content", { path: filePath })
      .then((text) => {
        setContent(text);
        setOriginalContent(text);
        setHasChanges(false);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [filePath]);

  const handleFileSelect = useCallback((path: string) => {
    onPanelUpdate({
      filePath: path,
      title: path.split("/").pop(),
    });
    setShowFileBrowser(false);
  }, [onPanelUpdate]);

  const handleChangeFile = useCallback(() => {
    setShowFileBrowser(true);
  }, []);

  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || "";
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  }, [originalContent]);

  const handleCheckboxToggle = useCallback((index: number) => {
    if (!content) return;
    const newContent = toggleCheckboxAtIndex(content, index);
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  }, [content, originalContent]);

  const handleSave = useCallback(async () => {
    if (!filePath || !content) return;
    try {
      setIsSaving(true);
      await invoke("write_file_content", { path: filePath, content });
      setOriginalContent(content);
      setHasChanges(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }, [filePath, content]);

  const handleReset = useCallback(() => {
    setContent(originalContent);
    setHasChanges(false);
  }, [originalContent]);

  const highlightMatches = useCallback(() => {
    if (!previewRef.current) return;

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

  const maxWidthValue = MARKDOWN_MAX_WIDTHS.find(w => w.id === markdownMaxWidth)?.value || "700px";

  if (!filePath) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
        <FileText className="w-10 h-10 text-text-secondary/50" />
        <p className="text-sm text-text-secondary">Select a Markdown file to view</p>
        <button
          onClick={() => setShowFileBrowser(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm rounded-lg",
            "bg-accent hover:bg-accent/80 text-primary-950 transition-colors"
          )}
        >
          <File className="w-4 h-4" />
          Open Markdown File
        </button>
        <FileBrowserPopup
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
          initialPath={projectPath}
          mode="selectFile"
          selectButtonLabel="Open File"
          onSelectFile={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/30 bg-bg-tertiary/50">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate flex-1 min-w-0">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate" title={filePath}>
            {fileName}
          </span>
          {hasChanges && (
            <span className="text-[10px] text-accent-yellow ml-1">*</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 bg-bg-tertiary rounded p-0.5">
            <Tooltip content="Edit" side="bottom">
              <button
                onClick={() => setViewMode("edit")}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === "edit"
                    ? "bg-bg-hover text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Code className="w-3 h-3" />
              </button>
            </Tooltip>
            <Tooltip content="Split" side="bottom">
              <button
                onClick={() => setViewMode("split")}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === "split"
                    ? "bg-bg-hover text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Columns className="w-3 h-3" />
              </button>
            </Tooltip>
            <Tooltip content="Preview" side="bottom">
              <button
                onClick={() => setViewMode("preview")}
                className={cn(
                  "p-1 rounded transition-colors",
                  viewMode === "preview"
                    ? "bg-bg-hover text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Eye className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>
          <div className="relative" ref={settingsRef}>
            <Tooltip content="Settings" side="bottom">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-1 rounded transition-colors",
                  showSettings
                    ? "bg-bg-hover text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Settings className="w-3 h-3" />
              </button>
            </Tooltip>
            {showSettings && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 p-3 space-y-3">
                <div className="text-[10px] font-medium text-text-primary uppercase tracking-wider">Preview Settings</div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary">Width</label>
                  <select
                    value={markdownMaxWidth}
                    onChange={(e) => setMarkdownMaxWidth(e.target.value as typeof markdownMaxWidth)}
                    className="w-full px-2 py-1 text-xs bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {MARKDOWN_MAX_WIDTHS.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-secondary">Font: {markdownFontSize}px</label>
                  <input
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
          {hasChanges && (
            <>
              <Tooltip content="Reset" side="bottom">
                <button
                  onClick={handleReset}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </Tooltip>
              <Tooltip content="Save" side="bottom">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1 rounded text-accent-green hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                </button>
              </Tooltip>
            </>
          )}
          <Tooltip content="Change file" side="bottom">
            <button
              onClick={handleChangeFile}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <File className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center w-full">
            <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center w-full gap-2 p-4">
            <File className="w-6 h-6 text-accent-red/50" />
            <p className="text-xs text-accent-red text-center">{error}</p>
          </div>
        )}

        {!loading && !error && content !== null && (
          <>
            {(viewMode === "edit" || viewMode === "split") && (
              <div
                className={cn(
                  "h-full overflow-hidden",
                  viewMode === "split" ? "w-1/2 border-r border-border/30" : "w-full"
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
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  }
                  options={{
                    fontSize: editorFontSize || 12,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: editorWordWrap ? "on" : "off",
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    padding: { top: 8, bottom: 8 },
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    renderValidationDecorations: "off",
                  }}
                />
              </div>
            )}

            {(viewMode === "preview" || viewMode === "split") && (
              <div
                className={cn(
                  "h-full bg-bg-tertiary flex flex-col",
                  viewMode === "split" ? "w-1/2" : "w-full"
                )}
              >
                {showFindBar && (
                  <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/30 bg-bg-secondary">
                    <Search className="w-3 h-3 text-text-secondary" />
                    <input
                      ref={findInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.shiftKey ? goToPrevMatch() : goToNextMatch();
                        }
                        if (e.key === "Escape") {
                          setShowFindBar(false);
                          setSearchQuery("");
                        }
                      }}
                      placeholder="Find..."
                      className="flex-1 px-1.5 py-0.5 text-xs bg-bg-tertiary border border-border rounded text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <span className="text-[10px] text-text-secondary min-w-[50px] text-center">
                      {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "0/0"}
                    </span>
                    <button
                      onClick={goToPrevMatch}
                      disabled={matchCount === 0}
                      className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={goToNextMatch}
                      disabled={matchCount === 0}
                      className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setShowFindBar(false);
                        setSearchQuery("");
                      }}
                      className="p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <ScrollArea className="flex-1">
                  <article
                    ref={previewRef}
                    className="markdown-preview mx-auto p-4"
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
                        ul: ({ children, className }) => {
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

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={projectPath}
        mode="selectFile"
        selectButtonLabel="Open File"
        onSelectFile={handleFileSelect}
      />
    </div>
  );
}
