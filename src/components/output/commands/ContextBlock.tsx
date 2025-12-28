import { FileText, FolderOpen, MessageSquare, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextResponse, ContextItem } from "@/types/slashCommandResponse";

interface ContextBlockProps {
  data: ContextResponse;
}

function getItemIcon(type: ContextItem["type"]) {
  switch (type) {
    case "file":
      return <FileText className="w-3.5 h-3.5" />;
    case "directory":
      return <FolderOpen className="w-3.5 h-3.5" />;
    case "system":
      return <Settings className="w-3.5 h-3.5" />;
    case "conversation":
      return <MessageSquare className="w-3.5 h-3.5" />;
    default:
      return <HelpCircle className="w-3.5 h-3.5" />;
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

export function ContextBlock({ data }: ContextBlockProps) {
  const { totalTokens, maxTokens, usedPercentage, items } = data;

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Context Usage</span>
          <span className="font-mono text-text-primary">
            {formatTokens(totalTokens)} / {formatTokens(maxTokens)}
          </span>
        </div>
        <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usedPercentage > 90
                ? "bg-accent-red"
                : usedPercentage > 70
                  ? "bg-yellow-500"
                  : "bg-accent"
            )}
            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-text-secondary text-right">
          {usedPercentage.toFixed(1)}% used
        </div>
      </div>

      {/* Context items */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-text-secondary mb-2">Context Breakdown</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-bg-hover/50"
              >
                <span className="text-text-secondary/70">
                  {getItemIcon(item.type)}
                </span>
                <span className="flex-1 text-xs font-mono truncate text-text-primary">
                  {item.name}
                </span>
                <span className="text-xs text-text-secondary tabular-nums">
                  {formatTokens(item.tokens)}
                </span>
                {item.percentage !== undefined && (
                  <span className="text-xs text-text-secondary/50 w-12 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
