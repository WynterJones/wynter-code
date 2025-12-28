import { Activity, ArrowDownLeft, ArrowUpRight, Database, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageResponse } from "@/types/slashCommandResponse";

interface UsageBlockProps {
  data: UsageResponse;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

interface TokenBarProps {
  label: string;
  tokens: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

function TokenBar({ label, tokens, total, icon, color }: TokenBarProps) {
  const percentage = total > 0 ? (tokens / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-secondary">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-mono text-text-primary">{formatTokens(tokens)}</span>
      </div>
      <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function UsageBlock({ data }: UsageBlockProps) {
  const {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    turns,
    apiDurationMs,
  } = data;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-sm text-text-secondary">Total:</span>
          <span className="font-mono text-text-primary">{formatTokens(totalTokens)}</span>
        </div>
        {turns !== undefined && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Turns:</span>
            <span className="font-mono text-text-primary">{turns}</span>
          </div>
        )}
        {apiDurationMs !== undefined && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Duration:</span>
            <span className="font-mono text-text-primary">{formatDuration(apiDurationMs)}</span>
          </div>
        )}
      </div>

      {/* Token bars */}
      <div className="space-y-3">
        <TokenBar
          label="Input"
          tokens={inputTokens}
          total={totalTokens}
          icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
          color="bg-green-500"
        />
        <TokenBar
          label="Output"
          tokens={outputTokens}
          total={totalTokens}
          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          color="bg-blue-500"
        />
        {cacheReadTokens !== undefined && cacheReadTokens > 0 && (
          <TokenBar
            label="Cache Read"
            tokens={cacheReadTokens}
            total={totalTokens}
            icon={<Database className="w-3.5 h-3.5" />}
            color="bg-purple-500"
          />
        )}
        {cacheWriteTokens !== undefined && cacheWriteTokens > 0 && (
          <TokenBar
            label="Cache Write"
            tokens={cacheWriteTokens}
            total={totalTokens}
            icon={<Database className="w-3.5 h-3.5" />}
            color="bg-orange-500"
          />
        )}
      </div>
    </div>
  );
}
