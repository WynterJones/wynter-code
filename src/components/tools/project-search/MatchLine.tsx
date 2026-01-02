import { useMemo } from "react";
import hljs from "highlight.js";
import { cn } from "@/lib/utils";
import type { SearchMatch } from "@/types";

interface MatchLineProps {
  match: SearchMatch;
  isSelected: boolean;
  onClick: () => void;
}

function getFileLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
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
  } catch (error) {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

export function MatchLine({
  match,
  isSelected,
  onClick,
}: MatchLineProps) {
  // Create highlighted version with match marked
  const contentWithMatch = useMemo(() => {
    const content = match.lineContent;
    const before = content.slice(0, match.matchStart);
    const matchText = content.slice(match.matchStart, match.matchEnd);
    const after = content.slice(match.matchEnd);

    // Escape HTML entities
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return `${escapeHtml(before)}<mark class="bg-accent/40 text-text-primary rounded px-0.5">${escapeHtml(matchText)}</mark>${escapeHtml(after)}`;
  }, [match]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer hover:bg-bg-hover transition-colors",
        isSelected && "bg-accent/10"
      )}
    >
      {/* Line Number */}
      <div className="w-12 px-2 py-0.5 text-right text-[10px] font-mono text-text-secondary border-r border-border shrink-0 select-none">
        {match.lineNumber}
      </div>

      {/* Code Content */}
      <pre
        className="flex-1 py-0.5 px-2 text-xs font-mono overflow-x-auto text-text-primary whitespace-pre"
        dangerouslySetInnerHTML={{ __html: contentWithMatch }}
      />
    </div>
  );
}

interface ContextLineProps {
  content: string;
  lineNumber: number;
  language: string;
}

export function ContextLine({
  content,
  lineNumber,
  language,
}: ContextLineProps) {
  const highlightedContent = useMemo(() => {
    return highlightCode(content, language);
  }, [content, language]);

  return (
    <div className="flex opacity-50">
      {/* Line Number */}
      <div className="w-12 px-2 py-0.5 text-right text-[10px] font-mono text-text-secondary border-r border-border shrink-0 select-none">
        {lineNumber}
      </div>

      {/* Code Content */}
      <pre
        className="flex-1 py-0.5 px-2 text-xs font-mono overflow-x-auto text-text-secondary whitespace-pre"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
    </div>
  );
}

export { getFileLanguage };
