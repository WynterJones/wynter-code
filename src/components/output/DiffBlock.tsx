import { useMemo } from "react";
import { FileEdit, FilePlus, FileX, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ParsedCliDiff,
  type CliDiffLine,
  getFileExtension,
} from "@/lib/parseCliDiff";
import hljs from "highlight.js";

interface DiffBlockProps {
  diff: ParsedCliDiff;
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

function getOperationIcon(operation: ParsedCliDiff["operation"]) {
  switch (operation) {
    case "Update":
      return <FileEdit className="w-3.5 h-3.5 text-accent-yellow" />;
    case "Create":
    case "Write":
      return <FilePlus className="w-3.5 h-3.5 text-accent-green" />;
    case "Delete":
      return <FileX className="w-3.5 h-3.5 text-accent-red" />;
    case "Read":
      return <Eye className="w-3.5 h-3.5 text-accent-blue" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-text-secondary" />;
  }
}

function DiffLine({
  line,
  language,
}: {
  line: CliDiffLine;
  language: string;
}) {
  const highlightedContent = useMemo(
    () => highlightCode(line.content, language),
    [line.content, language]
  );

  return (
    <div
      className={cn(
        "flex",
        line.type === "addition" && "bg-accent-green/10",
        line.type === "deletion" && "bg-accent-red/10"
      )}
    >
      <span
        className={cn(
          "w-12 px-2 py-0.5 text-right text-[10px] border-r border-border shrink-0 select-none",
          line.type === "addition" && "bg-accent-green/5 text-text-secondary",
          line.type === "deletion" && "bg-accent-red/5 text-text-secondary",
          line.type === "context" && "text-text-secondary"
        )}
      >
        {line.lineNumber}
      </span>

      <span
        className={cn(
          "w-6 shrink-0 text-center py-0.5 select-none font-bold",
          line.type === "addition" && "text-accent-green",
          line.type === "deletion" && "text-accent-red"
        )}
      >
        {line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " "}
      </span>

      <pre
        className={cn(
          "flex-1 py-0.5 pr-3 overflow-x-auto whitespace-pre",
          line.type === "context" && "text-text-secondary"
        )}
        dangerouslySetInnerHTML={{
          __html: highlightedContent || "&nbsp;",
        }}
      />
    </div>
  );
}

export function DiffBlock({ diff }: DiffBlockProps) {
  const language = useMemo(
    () => getFileExtension(diff.filename),
    [diff.filename]
  );

  const shortFilename = diff.filename.split("/").pop() || diff.filename;

  return (
    <div className="my-3 rounded-lg overflow-hidden bg-bg-secondary border border-border">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {getOperationIcon(diff.operation)}
          <span
            className="text-xs font-mono text-text-primary truncate"
            title={diff.filename}
          >
            {shortFilename}
          </span>
          <span
            className="text-[10px] text-text-secondary truncate hidden sm:inline"
            title={diff.filename}
          >
            {diff.filename !== shortFilename && `(${diff.filename})`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          {diff.additions > 0 && (
            <span className="text-accent-green">+{diff.additions}</span>
          )}
          {diff.deletions > 0 && (
            <span className="text-accent-red">-{diff.deletions}</span>
          )}
        </div>
      </div>

      {diff.lines.length > 0 && (
        <div className="font-mono text-xs overflow-x-auto">
          {diff.lines.map((line, idx) => (
            <DiffLine key={idx} line={line} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}
