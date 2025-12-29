import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { getModelLimits } from "@/services/modelLimits";

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

interface ContextProgressBarProps {
  className?: string;
}

export function ContextProgressBar({ className }: ContextProgressBarProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getActiveSession = useSessionStore((s) => s.getActiveSession);
  const getStreamingState = useSessionStore((s) => s.getStreamingState);
  const getContextStats = useSessionStore((s) => s.getContextStats);

  const session = activeProjectId ? getActiveSession(activeProjectId) : undefined;

  // Don't show if no session or if it's a terminal session
  if (!session || session.type === "terminal") {
    return null;
  }

  const sessionId = session.id;
  const provider = session.provider;
  const model = session.model;
  const limits = getModelLimits(provider, model);
  const contextLimit = limits.input;

  // Get context stats (persistent) and streaming stats (live)
  const contextStats = getContextStats(sessionId);
  const streamingState = getStreamingState(sessionId);

  // During streaming: show live stats if available, otherwise persisted
  // After turn: show persisted final values
  const streamingTokens = streamingState?.isStreaming ? streamingState.stats.inputTokens : 0;
  const persistedTokens = contextStats?.inputTokens ?? 0;
  const currentTokens = streamingTokens > 0 ? streamingTokens : persistedTokens;

  // Calculate percentage
  const percentage = contextLimit > 0
    ? Math.min(100, (currentTokens / contextLimit) * 100)
    : 0;

  // Color thresholds matching ContextBlock.tsx
  const barColor = percentage > 90
    ? "bg-accent-red"
    : percentage > 70
      ? "bg-yellow-500"
      : "bg-accent";

  const textColor = percentage > 90
    ? "text-accent-red"
    : percentage > 70
      ? "text-yellow-500"
      : "text-text-secondary";

  return (
    <Tooltip
      content={
        <div className="text-xs space-y-1">
          <div className="font-medium">
            {formatTokens(currentTokens)} / {formatTokens(contextLimit)}
          </div>
          <div className="text-text-secondary">
            {percentage.toFixed(1)}% context used
          </div>
          <div className="text-text-secondary/70 text-[10px]">
            {model} (max out: {formatTokens(limits.output)})
          </div>
        </div>
      }
      side="bottom"
    >
      <div
        className={cn(
          "flex items-center gap-1.5 cursor-default",
          className
        )}
      >
        {/* Progress bar container */}
        <div className="w-16 h-2 bg-bg-primary rounded-full overflow-hidden border border-border">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              barColor
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Percentage text */}
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums w-7",
            textColor
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </Tooltip>
  );
}
