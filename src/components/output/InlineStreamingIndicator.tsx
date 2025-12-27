import { useState, useEffect } from "react";
import { Zap, Brain, Terminal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamingStats } from "@/types";

interface InlineStreamingIndicatorProps {
  stats: StreamingStats;
  className?: string;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

export function InlineStreamingIndicator({ stats, className }: InlineStreamingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - stats.startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [stats.startTime]);

  const getStatusText = () => {
    if (stats.isThinking) return "Thinking";
    if (stats.currentTool) return stats.currentTool;
    return "Responding";
  };

  const getIcon = () => {
    if (stats.isThinking) {
      return <Brain className="w-4 h-4" />;
    }
    if (stats.currentTool) {
      return <Terminal className="w-4 h-4" />;
    }
    return <Zap className="w-4 h-4" />;
  };

  return (
    <div className={cn("mt-4 flex items-center gap-3", className)}>
      <div className="flex items-center gap-2">
        <span className="streaming-gradient-icon">
          {getIcon()}
        </span>
        <span className="streaming-gradient-text font-medium text-sm">
          {getStatusText()}
        </span>
        <span className="streaming-gradient-dots text-sm">...</span>
      </div>

      <span className="text-text-secondary/40">|</span>

      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-mono">{formatTime(elapsed)}</span>
      </div>

      {stats.model && (
        <>
          <span className="text-text-secondary/40">|</span>
          <span className="text-text-secondary font-mono text-xs">
            {stats.model.replace("claude-", "").replace(/-\d+$/, "")}
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-2 text-text-secondary text-xs">
        <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono text-[10px]">
          Esc
        </kbd>
        <span>to stop</span>
      </div>
    </div>
  );
}
