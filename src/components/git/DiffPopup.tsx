import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileEdit, FilePlus, FileX, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { IconButton, ScrollArea } from "@/components/ui";
import { gitService, type GitFile } from "@/services/git";
import { cn } from "@/lib/utils";
import hljs from "highlight.js";

interface DiffPopupProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  files: { file: GitFile; isStaged: boolean }[];
  initialFileIndex?: number;
}

interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: "context" | "addition" | "deletion" | "header";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function parseDiff(diffText: string): { hunks: DiffHunk[]; stats: { additions: number; deletions: number } } {
  const lines = diffText.split("\n");
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git") || line.startsWith("index ") ||
        line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }

    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      currentHunk = {
        header: line,
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: parseInt(hunkMatch[2] || "1", 10),
        newStart: parseInt(hunkMatch[3], 10),
        newCount: parseInt(hunkMatch[4] || "1", 10),
        lines: [],
      };
      hunks.push(currentHunk);
      oldLineNum = currentHunk.oldStart;
      newLineNum = currentHunk.newStart;
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "addition",
        content: line.slice(1),
        newLineNum: newLineNum++,
      });
      additions++;
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "deletion",
        content: line.slice(1),
        oldLineNum: oldLineNum++,
      });
      deletions++;
    } else if (line.startsWith(" ") || line === "") {
      currentHunk.lines.push({
        type: "context",
        content: line.slice(1) || "",
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    }
  }

  return { hunks, stats: { additions, deletions } };
}

function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    rs: "rust", py: "python", rb: "ruby", go: "go", java: "java",
    cpp: "cpp", c: "c", h: "c", hpp: "cpp", css: "css", scss: "scss",
    html: "html", json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
    sql: "sql", sh: "bash", bash: "bash", zsh: "bash",
  };
  return languageMap[ext] || "plaintext";
}

function highlightCode(code: string, language: string): string {
  try {
    if (hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

const statusConfig = {
  M: { icon: FileEdit, color: "text-accent-yellow", label: "Modified" },
  A: { icon: FilePlus, color: "text-accent-green", label: "Added" },
  D: { icon: FileX, color: "text-accent-red", label: "Deleted" },
  "?": { icon: FilePlus, color: "text-accent-blue", label: "Untracked" },
  U: { icon: FileEdit, color: "text-accent-orange", label: "Updated" },
};

export function DiffPopup({
  isOpen,
  onClose,
  projectPath,
  files,
  initialFileIndex = 0,
}: DiffPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(initialFileIndex);
  const [diff, setDiff] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set());

  const currentFile = files[currentIndex];
  const language = useMemo(
    () => (currentFile ? getFileExtension(currentFile.file.path) : "plaintext"),
    [currentFile]
  );

  useEffect(() => {
    setCurrentIndex(initialFileIndex);
  }, [initialFileIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentFile) return;

    async function loadDiff() {
      setLoading(true);
      const diffText = await gitService.getFileDiff(
        projectPath,
        currentFile.file.path,
        currentFile.isStaged
      );
      setDiff(diffText);
      setLoading(false);
      const parsed = parseDiff(diffText);
      setExpandedHunks(new Set(parsed.hunks.map((_, i) => i)));
    }
    loadDiff();
  }, [projectPath, currentFile, isOpen]);

  const { hunks, stats } = useMemo(() => parseDiff(diff), [diff]);

  const toggleHunk = (index: number) => {
    setExpandedHunks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < files.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    else if (e.key === "ArrowRight") goToNext();
  };

  if (!currentFile) return null;

  const config = statusConfig[currentFile.file.status] || statusConfig["M"];
  const FileIcon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="File Changes">
      <div className="flex flex-col h-[80vh]" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* File Navigation Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                title="Previous file (Left arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
              <span className="text-xs text-text-secondary px-2">
                {currentIndex + 1} / {files.length}
              </span>
              <IconButton
                size="sm"
                onClick={goToNext}
                disabled={currentIndex === files.length - 1}
                title="Next file (Right arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </div>
            <div className="flex items-center gap-2">
              <FileIcon className={cn("w-4 h-4", config.color)} />
              <span className="text-sm font-mono text-text-primary truncate max-w-[400px]">
                {currentFile.file.path}
              </span>
              {currentFile.isStaged && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent-green/20 text-accent-green rounded">
                  Staged
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-accent-green">+{stats.additions}</span>
            <span className="text-accent-red">-{stats.deletions}</span>
          </div>
        </div>

        {/* File List Sidebar + Diff Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* File List Sidebar */}
          <ScrollArea className="w-56 border-r border-border bg-bg-tertiary/50">
            <div className="p-2 space-y-0.5">
              {files.map((item, index) => {
                const itemConfig = statusConfig[item.file.status] || statusConfig["M"];
                const ItemIcon = itemConfig.icon;
                const fileName = item.file.path.split("/").pop() || item.file.path;
                return (
                  <button
                    key={`${item.file.path}-${item.isStaged}`}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                      index === currentIndex
                        ? "bg-accent/20 text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    )}
                  >
                    <ItemIcon className={cn("w-3.5 h-3.5 shrink-0", itemConfig.color)} />
                    <span className="text-xs truncate flex-1">{fileName}</span>
                    {item.isStaged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Diff Content */}
          <ScrollArea className="flex-1 bg-bg-secondary">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : !diff.trim() ? (
              <div className="flex items-center justify-center h-full text-text-secondary">
                No changes to display
              </div>
            ) : (
              <div>
                {hunks.map((hunk, hunkIndex) => (
                  <div key={hunkIndex} className="border-b border-border last:border-b-0">
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 cursor-pointer hover:bg-bg-hover transition-colors sticky top-0"
                      onClick={() => toggleHunk(hunkIndex)}
                    >
                      <span className="text-text-secondary">
                        {expandedHunks.has(hunkIndex) ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-accent-cyan">
                        @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
                      </span>
                    </div>

                    {expandedHunks.has(hunkIndex) && (
                      <div className="font-mono text-xs">
                        {hunk.lines.map((line, lineIndex) => (
                          <div
                            key={lineIndex}
                            className={cn(
                              "flex",
                              line.type === "addition" && "bg-accent-green/10",
                              line.type === "deletion" && "bg-accent-red/10"
                            )}
                          >
                            <div className="flex shrink-0 select-none">
                              <span
                                className={cn(
                                  "w-12 px-2 py-0.5 text-right text-[10px] border-r border-border",
                                  line.type === "addition"
                                    ? "bg-accent-green/5 text-text-secondary"
                                    : line.type === "deletion"
                                    ? "bg-accent-red/5 text-text-secondary"
                                    : "text-text-secondary"
                                )}
                              >
                                {line.oldLineNum ?? ""}
                              </span>
                              <span
                                className={cn(
                                  "w-12 px-2 py-0.5 text-right text-[10px] border-r border-border",
                                  line.type === "addition"
                                    ? "bg-accent-green/5 text-text-secondary"
                                    : line.type === "deletion"
                                    ? "bg-accent-red/5 text-text-secondary"
                                    : "text-text-secondary"
                                )}
                              >
                                {line.newLineNum ?? ""}
                              </span>
                            </div>

                            <span
                              className={cn(
                                "w-6 shrink-0 text-center py-0.5 select-none",
                                line.type === "addition" && "text-accent-green",
                                line.type === "deletion" && "text-accent-red"
                              )}
                            >
                              {line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " "}
                            </span>

                            <pre
                              className={cn(
                                "flex-1 py-0.5 pr-3 overflow-x-auto",
                                line.type === "addition" && "text-text-primary",
                                line.type === "deletion" && "text-text-primary",
                                line.type === "context" && "text-text-secondary"
                              )}
                              dangerouslySetInnerHTML={{
                                __html: highlightCode(line.content, language) || "&nbsp;",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Modal>
  );
}
