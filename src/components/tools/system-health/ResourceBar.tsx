import { cn } from "@/lib/utils";

interface ResourceBarProps {
  label: string;
  value: number;
  sublabel?: string;
  color?: "accent" | "blue" | "green" | "purple" | "red" | "yellow";
}

const colorClasses = {
  accent: "bg-accent",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
};

export function ResourceBar({
  label,
  value,
  sublabel,
  color = "accent",
}: ResourceBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const isHigh = clampedValue > 80;
  const barColor = isHigh ? "bg-red-500" : colorClasses[color];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary truncate">{label}</span>
        <span
          className={cn(
            "text-xs font-mono font-medium",
            isHigh ? "text-red-400" : "text-text-primary"
          )}
        >
          {clampedValue.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            barColor
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {sublabel && (
        <div className="text-[10px] text-text-secondary/70">{sublabel}</div>
      )}
    </div>
  );
}
