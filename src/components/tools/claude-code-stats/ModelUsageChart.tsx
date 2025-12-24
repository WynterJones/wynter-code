import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ModelUsageData } from "./types";

interface ModelUsageChartProps {
  modelUsage: Record<string, ModelUsageData>;
}

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-5-20251101": "#da7756",
  "claude-sonnet-4-5-20250929": "#f59e0b",
  "claude-sonnet-4-20250514": "#f59e0b",
  "claude-haiku-3-5-20241022": "#10a37f",
  default: "#6b7280",
};

const getModelColor = (modelId: string): string => {
  return MODEL_COLORS[modelId] || MODEL_COLORS.default;
};

const getModelDisplayName = (modelId: string): string => {
  if (modelId.includes("opus-4-5")) return "Opus 4.5";
  if (modelId.includes("sonnet-4-5")) return "Sonnet 4.5";
  if (modelId.includes("sonnet-4-")) return "Sonnet 4";
  if (modelId.includes("haiku")) return "Haiku 3.5";
  return modelId.split("-").slice(0, 2).join(" ");
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
};

export function ModelUsageChart({ modelUsage }: ModelUsageChartProps) {
  const pieData = Object.entries(modelUsage).map(([model, data]) => ({
    name: getModelDisplayName(model),
    value: data.inputTokens + data.outputTokens,
    model,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    cacheRead: data.cacheReadInputTokens,
    cacheCreation: data.cacheCreationInputTokens,
  }));

  const totalTokens = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.model}
                  fill={getModelColor(entry.model)}
                  stroke="var(--color-bg-primary)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [formatTokens(value as number), "Tokens"]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-text-secondary">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {pieData.map((model) => {
          const percentage = ((model.value / totalTokens) * 100).toFixed(1);
          return (
            <div key={model.model} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getModelColor(model.model) }}
                  />
                  <span className="text-text-primary">{model.name}</span>
                </div>
                <span className="text-text-secondary">
                  {formatTokens(model.value)} ({percentage}%)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-text-tertiary pl-4">
                <div>
                  <span className="text-text-secondary">In:</span>{" "}
                  {formatTokens(model.inputTokens)}
                </div>
                <div>
                  <span className="text-text-secondary">Out:</span>{" "}
                  {formatTokens(model.outputTokens)}
                </div>
                <div>
                  <span className="text-text-secondary">Cache R:</span>{" "}
                  {formatTokens(model.cacheRead)}
                </div>
                <div>
                  <span className="text-text-secondary">Cache W:</span>{" "}
                  {formatTokens(model.cacheCreation)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
