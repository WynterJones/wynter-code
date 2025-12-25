import { useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { cn } from "@/lib/utils";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { AutoBuildLogEntry } from "@/types/autoBuild";

const LOG_COLORS: Record<AutoBuildLogEntry["type"], string> = {
  info: "text-blue-400",
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-amber-400",
  claude: "text-purple-400",
};

const LOG_PREFIXES: Record<AutoBuildLogEntry["type"], string> = {
  info: "[INFO]",
  success: "[OK]",
  error: "[ERR]",
  warning: "[WARN]",
  claude: "[CLAUDE]",
};

export function AutoBuildLog() {
  const { logs, clearLogs } = useAutoBuildStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="flex h-full flex-col font-mono text-xs">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-[#0a0a0a] px-3 py-1.5">
        <span className="text-text-secondary">Activity Log</span>
        <button
          onClick={clearLogs}
          disabled={logs.length === 0}
          className={cn(
            "rounded p-1 transition-colors",
            logs.length > 0
              ? "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              : "cursor-not-allowed text-text-secondary/30"
          )}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Log entries - Console style */}
      <OverlayScrollbarsComponent
        className="flex-1"
        options={{ scrollbars: { autoHide: "scroll" } }}
      >
        <div className="p-2">
          {logs.length === 0 ? (
            <div className="text-text-secondary/50">
              $ Waiting for activity...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 py-0.5 leading-relaxed"
              >
                <span className="shrink-0 text-text-secondary/60">
                  {formatTime(log.timestamp)}
                </span>
                <span className={cn("shrink-0 w-16", LOG_COLORS[log.type])}>
                  {LOG_PREFIXES[log.type]}
                </span>
                <span className="text-text-primary/90">{log.message}</span>
                {log.issueId && (
                  <span className="shrink-0 text-text-secondary/50">
                    ({log.issueId})
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
