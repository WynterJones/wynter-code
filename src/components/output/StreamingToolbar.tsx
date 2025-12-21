import { useState, useEffect } from "react";
import { Brain, Terminal, Coins, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamingStats } from "@/types";

interface StreamingToolbarProps {
  isStreaming: boolean;
  stats: StreamingStats;
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

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function StreamingToolbar({ isStreaming, stats }: StreamingToolbarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - stats.startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, stats.startTime]);

  if (!isStreaming) return null;

  const totalTokens = stats.inputTokens + stats.outputTokens;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2",
        "bg-bg-tertiary/80 backdrop-blur-sm",
        "border-t border-border/50",
        "text-xs"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {stats.isThinking ? (
            <>
              <Brain className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-accent font-medium">Thinking</span>
              <span className="text-text-secondary animate-pulse">...</span>
            </>
          ) : stats.currentTool ? (
            <>
              <Terminal className="w-4 h-4 text-accent-yellow animate-pulse" />
              <span className="text-accent-yellow font-medium font-mono">
                {stats.currentTool}
              </span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-accent font-medium">Responding</span>
              <span className="text-text-secondary animate-pulse">...</span>
            </>
          )}
        </div>

        <span className="text-text-secondary/50">|</span>

        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{formatTime(elapsed)}</span>
        </div>

        {totalTokens > 0 && (
          <>
            <span className="text-text-secondary/50">|</span>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Coins className="w-3.5 h-3.5" />
              <span className="font-mono">{formatTokens(totalTokens)} tokens</span>
            </div>
          </>
        )}

        {stats.model && (
          <>
            <span className="text-text-secondary/50">|</span>
            <span className="text-text-secondary font-mono">
              {stats.model.replace("claude-", "").replace(/-\d+$/, "")}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-text-secondary">
        <kbd className="px-1.5 py-0.5 rounded bg-bg-hover font-mono text-[10px]">
          Esc
        </kbd>
        <span>to stop</span>
      </div>
    </div>
  );
}
