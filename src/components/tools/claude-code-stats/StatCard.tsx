import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  subValue?: string;
  color?: "accent" | "blue" | "green" | "purple" | "yellow" | "red" | "cyan" | "orange";
}

const colorConfig = {
  accent: {
    icon: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  blue: {
    icon: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  green: {
    icon: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  purple: {
    icon: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  yellow: {
    icon: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  red: {
    icon: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  cyan: {
    icon: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  orange: {
    icon: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  subValue,
  color = "accent",
}: StatCardProps) {
  const colors = colorConfig[color];

  return (
    <div className={`bg-bg-secondary rounded-lg p-3 flex flex-col gap-1.5 border ${colors.border} hover:border-opacity-40 transition-colors`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${colors.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
        </div>
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 pl-0.5">
        <span className="text-xl font-bold text-text-primary tabular-nums">{value}</span>
        {subValue && (
          <span className="text-[10px] text-text-tertiary">{subValue}</span>
        )}
      </div>
    </div>
  );
}
