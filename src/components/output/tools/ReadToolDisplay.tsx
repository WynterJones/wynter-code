import { useMemo } from "react";
import { FileText } from "lucide-react";
import hljs from "highlight.js";

interface ReadToolDisplayProps {
  input: {
    file_path?: string;
    offset?: number;
    limit?: number;
  };
  output?: string;
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
    xml: "xml",
  };
  return languageMap[ext] || "plaintext";
}

export function ReadToolDisplay({ input, output }: ReadToolDisplayProps) {
  const filePath = input.file_path || "";
  const shortPath = filePath.split("/").slice(-2).join("/");
  const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);

  // Parse output - it usually has line numbers like "   1→content"
  const lines = useMemo(() => {
    if (!output) return [];
    return output.split("\n").slice(0, 30); // Limit to first 30 lines
  }, [output]);

  const highlightedLines = useMemo(() => {
    return lines.map((line) => {
      // Extract line number and content from format "   1→content"
      const match = line.match(/^\s*(\d+)→(.*)$/);
      if (match) {
        const lineNum = match[1];
        const content = match[2];
        try {
          const highlighted = hljs.getLanguage(language)
            ? hljs.highlight(content, { language }).value
            : content;
          return { lineNum, content: highlighted, raw: content };
        } catch (error) {
          return { lineNum, content, raw: content };
        }
      }
      // Plain line without number
      return { lineNum: null, content: line, raw: line };
    });
  }, [lines, language]);

  const totalLines = output?.split("\n").length || 0;

  return (
    <div className="space-y-2">
      {/* File info header */}
      <div className="rounded-lg bg-bg-tertiary border border-border overflow-hidden">
        <div className="px-2 py-1.5 flex items-center gap-2">
          <FileText className="w-3 h-3 text-accent-green" />
          <span className="text-[11px] font-mono text-text-primary truncate" title={filePath}>
            {shortPath}
          </span>
          <span className="text-[10px] text-text-secondary ml-auto">{language}</span>
        </div>
      </div>

      {/* File content */}
      {output && (
        <div className="rounded-lg bg-bg-secondary border border-border overflow-hidden">
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-[10px] font-mono">
              <tbody>
                {highlightedLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-bg-hover/30">
                    {line.lineNum && (
                      <td className="px-2 py-0.5 text-right text-text-secondary/50 select-none border-r border-border/50 w-10 align-top">
                        {line.lineNum}
                      </td>
                    )}
                    <td
                      className="px-2 py-0.5 text-text-primary whitespace-pre overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: line.content || "&nbsp;" }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
            {totalLines > 30 && (
              <div className="px-2 py-1 text-[10px] text-text-secondary/50 border-t border-border/50">
                ... {totalLines - 30} more lines
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
