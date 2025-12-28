import { DollarSign, ArrowDownLeft, ArrowUpRight, Database } from "lucide-react";
import type { CostResponse } from "@/types/slashCommandResponse";

interface CostBlockProps {
  data: CostResponse;
}

function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
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

export function CostBlock({ data }: CostBlockProps) {
  const {
    sessionTotal,
    currentTurn,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  } = data;

  return (
    <div className="space-y-4">
      {/* Main cost display */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="text-2xl font-mono text-text-primary">
            {formatCost(sessionTotal)}
          </div>
          <div className="text-xs text-text-secondary">Session Total</div>
        </div>
        {currentTurn !== undefined && (
          <div className="ml-auto text-right">
            <div className="text-sm font-mono text-text-primary">
              {formatCost(currentTurn)}
            </div>
            <div className="text-xs text-text-secondary">This Turn</div>
          </div>
        )}
      </div>

      {/* Token breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-hover/50">
          <ArrowDownLeft className="w-4 h-4 text-green-400" />
          <div>
            <div className="text-sm font-mono text-text-primary">
              {formatTokens(inputTokens)}
            </div>
            <div className="text-xs text-text-secondary">Input</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-hover/50">
          <ArrowUpRight className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-sm font-mono text-text-primary">
              {formatTokens(outputTokens)}
            </div>
            <div className="text-xs text-text-secondary">Output</div>
          </div>
        </div>
        {(cacheReadTokens !== undefined || cacheWriteTokens !== undefined) && (
          <>
            {cacheReadTokens !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-hover/50">
                <Database className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-sm font-mono text-text-primary">
                    {formatTokens(cacheReadTokens)}
                  </div>
                  <div className="text-xs text-text-secondary">Cache Read</div>
                </div>
              </div>
            )}
            {cacheWriteTokens !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-hover/50">
                <Database className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-sm font-mono text-text-primary">
                    {formatTokens(cacheWriteTokens)}
                  </div>
                  <div className="text-xs text-text-secondary">Cache Write</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
