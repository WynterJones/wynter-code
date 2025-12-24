import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DailyActivity, DateRange } from "./types";

interface ActivityChartProps {
  data: DailyActivity[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

type MetricKey = "messageCount" | "sessionCount" | "toolCallCount";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "messageCount", label: "Messages", color: "#da7756" },
  { key: "sessionCount", label: "Sessions", color: "#4285f4" },
  { key: "toolCallCount", label: "Tool Calls", color: "#10a37f" },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
];

export function ActivityChart({
  data,
  dateRange,
  onDateRangeChange,
}: ActivityChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "messageCount",
    "sessionCount",
    "toolCallCount",
  ]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatValue = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {METRICS.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeMetrics.includes(metric.key)
                  ? "bg-bg-tertiary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              style={{
                borderLeft: activeMetrics.includes(metric.key)
                  ? `2px solid ${metric.color}`
                  : "2px solid transparent",
              }}
            >
              {metric.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => onDateRangeChange(range.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                dateRange === range.value
                  ? "bg-accent text-black"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="var(--color-text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatValue}
              stroke="var(--color-text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelFormatter={formatDate}
              formatter={(value) => [
                formatValue(value as number),
                "",
              ]}
            />
            {METRICS.filter((m) => activeMetrics.includes(m.key)).map(
              (metric) => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
