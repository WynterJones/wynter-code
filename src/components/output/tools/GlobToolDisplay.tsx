import { FolderOpen } from "lucide-react";

interface GlobToolDisplayProps {
  input: {
    pattern?: string;
    path?: string;
  };
  output?: string;
}

export function GlobToolDisplay({ input, output }: GlobToolDisplayProps) {
  const pattern = input.pattern || "";
  const path = input.path || ".";

  // Parse output - list of file paths
  const files = output?.split("\n").filter((f) => f.trim()) || [];

  return (
    <div className="space-y-2">
      {/* Input section */}
      <div className="rounded-lg bg-bg-tertiary border border-border overflow-hidden">
        <div className="px-2 py-1 bg-bg-hover border-b border-border flex items-center gap-2">
          <FolderOpen className="w-3 h-3 text-accent-orange" />
          <span className="text-[10px] text-text-secondary">Glob</span>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-secondary shrink-0 w-14">pattern:</span>
            <code className="text-[11px] font-mono text-accent-orange bg-accent-orange/10 px-1.5 py-0.5 rounded break-all">
              {pattern}
            </code>
          </div>
          {path !== "." && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-text-secondary shrink-0 w-14">path:</span>
              <span className="text-[11px] font-mono text-text-primary break-all">{path}</span>
            </div>
          )}
        </div>
      </div>

      {/* Output - file list */}
      {output && (
        <div className="rounded-lg bg-bg-secondary border border-border overflow-hidden">
          <div className="px-2 py-1 bg-bg-hover border-b border-border">
            <span className="text-[10px] text-text-secondary">
              {files.length} {files.length === 1 ? "file" : "files"} matched
            </span>
          </div>
          <div className="max-h-40 overflow-auto p-1.5 space-y-0.5">
            {files.slice(0, 20).map((file, idx) => {
              const parts = file.split("/");
              const filename = parts.pop();
              const dir = parts.join("/");
              return (
                <div key={idx} className="text-[10px] font-mono flex" title={file}>
                  {dir && <span className="text-text-secondary/50 truncate">{dir}/</span>}
                  <span className="text-accent-green">{filename}</span>
                </div>
              );
            })}
            {files.length > 20 && (
              <div className="text-[10px] text-text-secondary/50 pt-1">
                ... and {files.length - 20} more files
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
