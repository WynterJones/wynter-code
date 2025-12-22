import { useState, useEffect, useMemo } from "react";
import { X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { IconButton, ScrollArea } from "@/components/ui";
import { gitService, type GitFile } from "@/services/git";
import { cn } from "@/lib/utils";
import hljs from "highlight.js";

interface DiffViewerProps {
  projectPath: string;
  file: GitFile;
  isStaged: boolean;
  onClose: () => void;
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
    // Skip diff headers
    if (line.startsWith("diff --git") || line.startsWith("index ") ||
        line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }

    // Parse hunk header: @@ -old,count +new,count @@
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
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
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
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

export function DiffViewer({ projectPath, file, isStaged, onClose }: DiffViewerProps) {
  const [diff, setDiff] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set([0]));

  const language = useMemo(() => getFileExtension(file.path), [file.path]);

  useEffect(() => {
    async function loadDiff() {
      setLoading(true);
      const diffText = await gitService.getFileDiff(projectPath, file.path, isStaged);
      setDiff(diffText);
      setLoading(false);
      // Expand all hunks by default
      const parsed = parseDiff(diffText);
      setExpandedHunks(new Set(parsed.hunks.map((_, i) => i)));
    }
    loadDiff();
  }, [projectPath, file.path, isStaged]);

  const { hunks, stats } = useMemo(() => parseDiff(diff), [diff]);

  const toggleHunk = (index: number) => {
    setExpandedHunks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const fileName = file.path.split("/").pop() || file.path;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-bg-secondary rounded-lg border border-border">
        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!diff.trim()) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-primary">{fileName}</span>
          </div>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
        <div className="p-4 text-center text-sm text-text-secondary">
          No changes to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-primary truncate max-w-[200px]" title={file.path}>
            {file.path}
          </span>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-accent-green">+{stats.additions}</span>
            <span className="text-accent-red">-{stats.deletions}</span>
          </div>
        </div>
        <IconButton size="sm" onClick={onClose} title="Close diff">
          <X className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Diff Content */}
      <ScrollArea className="max-h-[400px]">
        {hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b border-border last:border-b-0">
            {/* Hunk Header */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 cursor-pointer hover:bg-bg-hover transition-colors"
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

            {/* Hunk Lines */}
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
                    {/* Line Numbers */}
                    <div className="flex shrink-0 select-none">
                      <span
                        className={cn(
                          "w-10 px-2 py-0.5 text-right text-[10px] border-r border-border",
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
                          "w-10 px-2 py-0.5 text-right text-[10px] border-r border-border",
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

                    {/* Type Indicator */}
                    <span
                      className={cn(
                        "w-6 shrink-0 text-center py-0.5 select-none",
                        line.type === "addition" && "text-accent-green",
                        line.type === "deletion" && "text-accent-red"
                      )}
                    >
                      {line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " "}
                    </span>

                    {/* Code Content */}
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
      </ScrollArea>
    </div>
  );
}
