import { useMemo } from "react";
import { cn } from "@/lib/utils";
import hljs from "highlight.js";

interface EditToolInputProps {
  input: {
    file_path?: string;
    old_string?: string;
    new_string?: string;
  };
}

function getLanguageFromPath(filePath: string): string {
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
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    toml: "toml",
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

export function EditToolInput({ input }: EditToolInputProps) {
  const filePath = input.file_path || "unknown";
  const oldString = input.old_string || "";
  const newString = input.new_string || "";
  const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);

  const oldLines = useMemo(() => oldString.split("\n"), [oldString]);
  const newLines = useMemo(() => newString.split("\n"), [newString]);

  const highlightedOld = useMemo(
    () => oldLines.map((line) => highlightCode(line, language)),
    [oldLines, language]
  );
  const highlightedNew = useMemo(
    () => newLines.map((line) => highlightCode(line, language)),
    [newLines, language]
  );

  const shortFilename = filePath.split("/").pop() || filePath;

  return (
    <div className="rounded-lg overflow-hidden bg-bg-secondary border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary border-b border-border">
        <span
          className="text-xs font-mono text-text-secondary truncate"
          title={filePath}
        >
          {shortFilename}
        </span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-accent-red">-{oldLines.length}</span>
          <span className="text-accent-green">+{newLines.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border text-xs font-mono">
        {/* Old string - left side */}
        <div className="overflow-x-auto">
          <div className="px-1 py-0.5 bg-accent-red/5 text-[10px] text-accent-red border-b border-border">
            old
          </div>
          {oldLines.map((_, idx) => (
            <div
              key={`old-${idx}`}
              className={cn(
                "flex bg-accent-red/5",
                oldString.trim() === "" && "opacity-50"
              )}
            >
              <span className="w-8 px-1 py-0.5 text-right text-[10px] text-text-secondary border-r border-border shrink-0 select-none">
                {idx + 1}
              </span>
              <pre
                className="flex-1 py-0.5 px-2 overflow-x-auto whitespace-pre text-text-secondary"
                dangerouslySetInnerHTML={{
                  __html: highlightedOld[idx] || "&nbsp;",
                }}
              />
            </div>
          ))}
        </div>

        {/* New string - right side */}
        <div className="overflow-x-auto">
          <div className="px-1 py-0.5 bg-accent-green/5 text-[10px] text-accent-green border-b border-border">
            new
          </div>
          {newLines.map((_, idx) => (
            <div key={`new-${idx}`} className="flex bg-accent-green/5">
              <span className="w-8 px-1 py-0.5 text-right text-[10px] text-text-secondary border-r border-border shrink-0 select-none">
                {idx + 1}
              </span>
              <pre
                className="flex-1 py-0.5 px-2 overflow-x-auto whitespace-pre"
                dangerouslySetInnerHTML={{
                  __html: highlightedNew[idx] || "&nbsp;",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
