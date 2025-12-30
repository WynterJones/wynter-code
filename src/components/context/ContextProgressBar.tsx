import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { getModelLimits } from "@/services/modelLimits";
import { useShallow } from "zustand/react/shallow";

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

  // Get flattened session data - useShallow compares primitive values to prevent infinite loops
  const {
    sessionId,
    provider,
    model,
    inputTokens,
    isStreaming,
    streamingInputTokens,
  } = useSessionStore(
    useShallow((s) => {
      const activeId = activeProjectId ? s.activeSessionId.get(activeProjectId) : undefined;
      if (!activeProjectId || !activeId) {
        return {
          sessionId: null,
          provider: null,
          model: null,
          inputTokens: 0,
          isStreaming: false,
          streamingInputTokens: 0,
        };
      }

      const projectSessions = s.sessions.get(activeProjectId);
      const foundSession = projectSessions?.find((sess) => sess.id === activeId);

      if (!foundSession || foundSession.type === "terminal") {
        return {
          sessionId: null,
          provider: null,
          model: null,
          inputTokens: 0,
          isStreaming: false,
          streamingInputTokens: 0,
        };
      }

      const contextStats = s.sessionContextStats.get(activeId);
      const streamingState = s.streamingState.get(activeId);

      return {
        sessionId: foundSession.id,
        provider: foundSession.provider,
        model: foundSession.model,
        inputTokens: contextStats?.inputTokens ?? 0,
        isStreaming: streamingState?.isStreaming ?? false,
        streamingInputTokens: streamingState?.stats.inputTokens ?? 0,
      };
    })
  );

  // Don't show if no session (terminal sessions already filtered in selector)
  if (!sessionId || !provider || !model) {
    return null;
  }

  const limits = getModelLimits(provider, model);
  const contextLimit = limits.input;

  // During streaming: show live stats if available, otherwise persisted
  const currentTokens = isStreaming && streamingInputTokens > 0
    ? streamingInputTokens
    : inputTokens;

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
          <div className="text-text-secondary/50 text-[9px] italic">
            * estimation only
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
