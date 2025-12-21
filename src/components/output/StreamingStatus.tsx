import { useState, useEffect } from "react";
import { Loader2, Clock, ArrowDown, Zap, Brain, Terminal } from "lucide-react";
import { Badge } from "@/components/ui";
import type { StreamingStats } from "@/types";
import { cn } from "@/lib/utils";

interface StreamingStatusProps {
  stats: StreamingStats;
  className?: string;
}

const thinkingPhrases = [
  "Thinking",
  "Marinating",
  "Pondering",
  "Processing",
  "Cogitating",
  "Analyzing",
  "Computing",
];

export function StreamingStatus({ stats, className }: StreamingStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - stats.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [stats.startTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  const totalTokens = stats.inputTokens + stats.outputTokens;
  const phrase = stats.currentTool
    ? `Using ${stats.currentTool}`
    : stats.isThinking
      ? thinkingPhrases[phraseIndex]
      : "Processing";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg",
        "bg-gradient-to-r from-accent-yellow/10 to-accent-orange/10",
        "border border-accent-yellow/30",
        className
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-accent-yellow">
        {stats.currentTool ? (
          <Terminal className="w-4 h-4" />
        ) : stats.isThinking ? (
          <Brain className="w-4 h-4" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span className="font-medium text-sm">
          {phrase}
          <span className="text-accent-yellow/70">{dots}</span>
        </span>
      </div>

      {/* Separator */}
      <span className="text-text-secondary/50">(</span>

      {/* ESC hint */}
      <span className="text-text-secondary text-xs">
        <kbd className="px-1.5 py-0.5 rounded bg-bg-hover text-text-primary text-xs font-mono">
          esc
        </kbd>
        <span className="ml-1">to interrupt</span>
      </span>

      {/* Separator */}
      <span className="text-text-secondary/50">·</span>

      {/* Time elapsed */}
      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
        <Clock className="w-3 h-3" />
        <span>{formatTime(elapsed)}</span>
      </div>

      {/* Separator */}
      <span className="text-text-secondary/50">·</span>

      {/* Token count */}
      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
        <ArrowDown className="w-3 h-3" />
        <span>{formatTokens(totalTokens)} tokens</span>
      </div>

      {/* Closing paren */}
      <span className="text-text-secondary/50">)</span>

      {/* Model badge (if available) */}
      {stats.model && (
        <Badge variant="info" className="ml-auto text-xs">
          <Zap className="w-3 h-3 mr-1" />
          {stats.model.includes("opus")
            ? "Opus"
            : stats.model.includes("sonnet")
              ? "Sonnet"
              : stats.model.includes("haiku")
                ? "Haiku"
                : "Claude"}
        </Badge>
      )}
    </div>
  );
}
