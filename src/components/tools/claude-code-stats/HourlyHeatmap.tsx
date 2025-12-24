interface HourlyHeatmapProps {
  hourCounts: Record<string, number>;
}

export function HourlyHeatmap({ hourCounts }: HourlyHeatmapProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxCount = Math.max(...Object.values(hourCounts), 1);

  const getIntensity = (hour: number): number => {
    const count = hourCounts[hour.toString()] || 0;
    return count / maxCount;
  };

  const getColor = (intensity: number): string => {
    if (intensity === 0) return "var(--color-bg-tertiary)";
    const alpha = 0.2 + intensity * 0.8;
    return `rgba(218, 119, 86, ${alpha})`;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-secondary">
        Session distribution by hour
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {hours.map((hour) => {
          const count = hourCounts[hour.toString()] || 0;
          const intensity = getIntensity(hour);
          return (
            <div
              key={hour}
              className="relative group"
            >
              <div
                className="h-10 rounded transition-colors cursor-default flex items-center justify-center"
                style={{ backgroundColor: getColor(intensity) }}
              >
                <span className="text-[10px] text-text-tertiary font-medium">
                  {formatHour(hour)}
                </span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {count} sessions at {hour}:00
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-text-tertiary">
        <span>Less</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getColor(intensity) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
