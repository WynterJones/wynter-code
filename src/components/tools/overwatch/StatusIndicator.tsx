import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/types/overwatch";

interface StatusIndicatorProps {
  status: ServiceStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<ServiceStatus, { color: string; label: string; pulse: boolean }> = {
  healthy: { color: "bg-green-500", label: "Healthy", pulse: false },
  degraded: { color: "bg-yellow-500", label: "Degraded", pulse: true },
  down: { color: "bg-red-500", label: "Down", pulse: true },
  unknown: { color: "bg-gray-500", label: "Unknown", pulse: false },
  loading: { color: "bg-blue-500", label: "Loading", pulse: true },
};

const SIZE_CLASSES = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

export function StatusIndicator({ status, size = "md", showLabel = false }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex">
        <span
          className={cn(
            SIZE_CLASSES[size],
            "rounded-full",
            config.color,
            config.pulse && "animate-pulse"
          )}
        />
        {config.pulse && (
          <span
            className={cn(
              SIZE_CLASSES[size],
              "absolute inset-0 rounded-full animate-ping opacity-75",
              config.color
            )}
          />
        )}
      </span>
      {showLabel && (
        <span className="text-xs text-text-secondary capitalize">{config.label}</span>
      )}
    </div>
  );
}
