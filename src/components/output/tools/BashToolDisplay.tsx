import { useMemo } from "react";
import { Terminal } from "lucide-react";
import hljs from "highlight.js";

interface BashToolDisplayProps {
  input: {
    command?: string;
    description?: string;
    timeout?: number;
  };
  output?: string;
}

export function BashToolDisplay({ input, output }: BashToolDisplayProps) {
  const command = input.command || "";
  const description = input.description || "";

  const highlightedCommand = useMemo(() => {
    try {
      return hljs.highlight(command, { language: "bash" }).value;
    } catch (error) {
      return command;
    }
  }, [command]);

  // Parse output lines
  const outputLines = useMemo(() => {
    if (!output) return [];
    return output.split("\n").slice(0, 50);
  }, [output]);

  const totalLines = output?.split("\n").length || 0;

  return (
    <div className="space-y-2">
      {/* Command input */}
      <div className="rounded-lg bg-bg-tertiary border border-border overflow-hidden">
        <div className="px-2 py-1 bg-bg-hover border-b border-border flex items-center gap-2">
          <Terminal className="w-3 h-3 text-accent-yellow" />
          <span className="text-[10px] text-text-secondary">Bash</span>
          {description && (
            <span className="text-[10px] text-text-secondary/50 ml-auto truncate max-w-[200px]">
              {description}
            </span>
          )}
        </div>
        <div className="p-2">
          <pre
            className="text-[11px] font-mono text-text-primary whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: highlightedCommand }}
          />
        </div>
      </div>

      {/* Command output */}
      {output && (
        <div className="rounded-lg bg-[#1a1a1a] border border-border overflow-hidden">
          <div className="max-h-48 overflow-auto p-2">
            <pre className="text-[10px] font-mono text-[#b0b0b0] whitespace-pre-wrap break-all">
              {outputLines.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line || " "}
                </div>
              ))}
              {totalLines > 50 && (
                <div className="text-text-secondary/50 pt-1">
                  ... {totalLines - 50} more lines
                </div>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
