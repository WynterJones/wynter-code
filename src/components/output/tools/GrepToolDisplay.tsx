import { Search } from "lucide-react";

interface GrepToolDisplayProps {
  input: {
    pattern?: string;
    path?: string;
    output_mode?: string;
    glob?: string;
    type?: string;
  };
  output?: string;
}

export function GrepToolDisplay({ input, output }: GrepToolDisplayProps) {
  const pattern = input.pattern || "";
  const path = input.path || ".";
  const outputMode = input.output_mode || "files_with_matches";

  // Parse output lines
  const outputLines = output?.split("\n").filter((l) => l.trim()) || [];

  return (
    <div className="space-y-2">
      {/* Input section */}
      <div className="rounded-lg bg-bg-tertiary border border-border overflow-hidden">
        <div className="px-2 py-1 bg-bg-hover border-b border-border flex items-center gap-2">
          <Search className="w-3 h-3 text-accent-cyan" />
          <span className="text-[10px] text-text-secondary">Grep</span>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-secondary shrink-0 w-14">pattern:</span>
            <code className="text-[11px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded break-all">
              {pattern}
            </code>
          </div>
          {path !== "." && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-text-secondary shrink-0 w-14">path:</span>
              <span className="text-[11px] font-mono text-text-primary break-all">{path}</span>
            </div>
          )}
          {input.glob && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-text-secondary shrink-0 w-14">glob:</span>
              <code className="text-[11px] font-mono text-accent-orange">{input.glob}</code>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary shrink-0 w-14">mode:</span>
            <span className="text-[10px] text-text-secondary/70">{outputMode}</span>
          </div>
        </div>
      </div>

      {/* Output section */}
      {output && (
        <div className="rounded-lg bg-bg-secondary border border-border overflow-hidden">
          <div className="px-2 py-1 bg-bg-hover border-b border-border">
            <span className="text-[10px] text-text-secondary">
              {outputLines.length} {outputLines.length === 1 ? "result" : "results"}
            </span>
          </div>
          <div className="max-h-40 overflow-auto">
            {outputMode === "content" ? (
              // Show content with line highlighting
              <div className="p-1.5 space-y-0.5">
                {outputLines.slice(0, 20).map((line, idx) => {
                  // Try to parse "filename:line:content" format
                  const match = line.match(/^([^:]+):(\d+):(.*)$/);
                  if (match) {
                    return (
                      <div key={idx} className="flex text-[10px] font-mono">
                        <span className="text-text-secondary/50 shrink-0 w-40 truncate" title={match[1]}>
                          {match[1].split("/").pop()}:{match[2]}
                        </span>
                        <span className="text-text-primary ml-2 break-all">{match[3]}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="text-[10px] font-mono text-text-primary">
                      {line}
                    </div>
                  );
                })}
                {outputLines.length > 20 && (
                  <div className="text-[10px] text-text-secondary/50 pt-1">
                    ... and {outputLines.length - 20} more
                  </div>
                )}
              </div>
            ) : (
              // Show file list
              <div className="p-1.5 space-y-0.5">
                {outputLines.slice(0, 15).map((file, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] font-mono text-accent-green truncate"
                    title={file}
                  >
                    {file}
                  </div>
                ))}
                {outputLines.length > 15 && (
                  <div className="text-[10px] text-text-secondary/50 pt-1">
                    ... and {outputLines.length - 15} more files
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
