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

function formatModelName(model: string): string {
  // Claude models: claude-opus-4-20250514 -> opus-4, claude-sonnet-4-20250514 -> sonnet-4
  if (model.startsWith("claude-")) {
    return model.replace("claude-", "").replace(/-\d{8}$/, "");
  }
  // Gemini models: gemini-2.5-flash -> Flash 2.5, gemini-3-pro -> Pro 3
  if (model.startsWith("gemini-")) {
    const match = model.match(/gemini-(\d+(?:\.\d+)?)-(\w+)/);
    if (match) {
      const [, version, variant] = match;
      return `${variant.charAt(0).toUpperCase() + variant.slice(1)} ${version}`;
    }
    return model.replace("gemini-", "");
  }
  // Codex models: gpt-5.2-codex -> Codex 5.2, gpt-5.1-codex-max -> Codex Max
  if (model.includes("codex")) {
    const match = model.match(/gpt-(\d+\.\d+)-codex(-(\w+))?/);
    if (match) {
      const [, version, , variant] = match;
      if (variant) {
        return `Codex ${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
      }
      return `Codex ${version}`;
    }
    return model;
  }
  return model;
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
              {formatModelName(stats.model)}
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
