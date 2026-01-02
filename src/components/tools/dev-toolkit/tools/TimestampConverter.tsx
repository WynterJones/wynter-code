import { Copy, Check, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useCopyWithFeedback } from "@/hooks/useCopyWithFeedback";

interface TimeFormat {
  id: string;
  label: string;
  format: (date: Date) => string;
}

const TIME_FORMATS: TimeFormat[] = [
  { id: "unix", label: "Unix Timestamp (seconds)", format: (d) => Math.floor(d.getTime() / 1000).toString() },
  { id: "unixMs", label: "Unix Timestamp (milliseconds)", format: (d) => d.getTime().toString() },
  { id: "iso", label: "ISO 8601", format: (d) => d.toISOString() },
  { id: "utc", label: "UTC String", format: (d) => d.toUTCString() },
  { id: "local", label: "Local String", format: (d) => d.toLocaleString() },
  { id: "date", label: "Date Only", format: (d) => d.toLocaleDateString() },
  { id: "time", label: "Time Only", format: (d) => d.toLocaleTimeString() },
  { id: "relative", label: "Relative", format: (d) => getRelativeTime(d) },
];

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff > 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let value: string;
  if (years > 0) value = `${years} year${years > 1 ? "s" : ""}`;
  else if (months > 0) value = `${months} month${months > 1 ? "s" : ""}`;
  else if (days > 0) value = `${days} day${days > 1 ? "s" : ""}`;
  else if (hours > 0) value = `${hours} hour${hours > 1 ? "s" : ""}`;
  else if (minutes > 0) value = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  else value = `${seconds} second${seconds !== 1 ? "s" : ""}`;

  return isPast ? `${value} ago` : `in ${value}`;
}

function parseInput(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{10}$/.test(trimmed)) {
    return new Date(parseInt(trimmed) * 1000);
  }

  if (/^\d{13}$/.test(trimmed)) {
    return new Date(parseInt(trimmed));
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

export function TimestampConverter() {
  const [input, setInput] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copy, isCopied } = useCopyWithFeedback();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleParse = useCallback(() => {
    const parsed = parseInput(input);
    if (parsed) {
      setDate(parsed);
      setError(null);
    } else {
      setDate(null);
      setError("Could not parse input. Try a Unix timestamp or ISO date.");
    }
  }, [input]);

  const handleNow = () => {
    const now = new Date();
    setInput(Math.floor(now.getTime() / 1000).toString());
    setDate(now);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
        <Clock className="w-4 h-4 text-accent" />
        <div className="flex flex-col">
          <span className="text-xs text-text-tertiary">Current Time</span>
          <span className="font-mono text-sm text-text-primary">
            {Math.floor(currentTime.getTime() / 1000)} ({currentTime.toLocaleString()})
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">
          Input (Unix timestamp or date string)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParse()}
            placeholder="e.g., 1703980800, 2024-01-01, or 2024-01-01T00:00:00Z"
            className={cn(
              "flex-1 px-3 py-2 text-sm font-mono",
              "bg-bg-primary border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              error ? "border-red-500/50" : "border-border"
            )}
          />
          <Button onClick={handleParse} variant="primary" size="sm">
            Convert
          </Button>
          <Button onClick={handleNow} variant="default" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Now
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {date && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-tertiary uppercase tracking-wider">Conversions</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TIME_FORMATS.map((format) => {
              const value = format.format(date);
              return (
                <div
                  key={format.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-tertiary mb-1">{format.label}</div>
                    <div className="font-mono text-sm text-text-primary truncate">{value}</div>
                  </div>
                  <Tooltip content={isCopied(format.id) ? "Copied!" : "Copy"}>
                    <IconButton
                      size="sm"
                      onClick={() => copy(value, format.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Copy ${format.label}`}
                    >
                      {isCopied(format.id) ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </IconButton>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!date && !error && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter a Unix timestamp or date string to convert
        </div>
      )}
    </div>
  );
}
