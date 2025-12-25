import { useState, useMemo } from "react";
import { Clock, AlertCircle, Copy, Check } from "lucide-react";
import cronstrue from "cronstrue";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface CronPreset {
  name: string;
  expression: string;
}

const CRON_PRESETS: CronPreset[] = [
  { name: "Every minute", expression: "* * * * *" },
  { name: "Every 5 minutes", expression: "*/5 * * * *" },
  { name: "Every hour", expression: "0 * * * *" },
  { name: "Every day at midnight", expression: "0 0 * * *" },
  { name: "Every day at noon", expression: "0 12 * * *" },
  { name: "Every Monday", expression: "0 0 * * 1" },
  { name: "Every weekday at 9am", expression: "0 9 * * 1-5" },
  { name: "First day of month", expression: "0 0 1 * *" },
  { name: "Every Sunday at 3am", expression: "0 3 * * 0" },
];

const CRON_FIELDS = [
  { name: "Minute", range: "0-59", special: ", - * /" },
  { name: "Hour", range: "0-23", special: ", - * /" },
  { name: "Day of Month", range: "1-31", special: ", - * / L W" },
  { name: "Month", range: "1-12 or JAN-DEC", special: ", - * /" },
  { name: "Day of Week", range: "0-6 or SUN-SAT", special: ", - * / L #" },
];

function parseCron(expression: string): { description: string; error: string | null } {
  try {
    const description = cronstrue.toString(expression, {
      throwExceptionOnParseError: true,
      use24HourTimeFormat: true,
    });
    return { description, error: null };
  } catch (e) {
    return { description: "", error: (e as Error).message };
  }
}

function getNextRuns(expression: string, count: number = 5): Date[] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const runs: Date[] = [];
  const now = new Date();
  let current = new Date(now);

  for (let attempts = 0; attempts < 1000 && runs.length < count; attempts++) {
    current = new Date(current.getTime() + 60000);
    current.setSeconds(0);
    current.setMilliseconds(0);

    const minute = current.getMinutes();
    const hour = current.getHours();
    const dayOfMonth = current.getDate();
    const month = current.getMonth() + 1;
    const dayOfWeek = current.getDay();

    if (
      matchField(parts[0], minute, 0, 59) &&
      matchField(parts[1], hour, 0, 23) &&
      matchField(parts[2], dayOfMonth, 1, 31) &&
      matchField(parts[3], month, 1, 12) &&
      matchField(parts[4], dayOfWeek, 0, 6)
    ) {
      runs.push(new Date(current));
    }
  }

  return runs;
}

function matchField(field: string, value: number, min: number, _max: number): boolean {
  if (field === "*") return true;

  const parts = field.split(",");
  for (const part of parts) {
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepNum = parseInt(step);
      const start = range === "*" ? min : parseInt(range.split("-")[0]);
      if ((value - start) % stepNum === 0 && value >= start) return true;
    } else if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (value >= start && value <= end) return true;
    } else {
      if (parseInt(part) === value) return true;
    }
  }

  return false;
}

export function CronParser() {
  const [input, setInput] = useState("0 9 * * 1-5");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => parseCron(input), [input]);
  const nextRuns = useMemo(() => (result.error ? [] : getNextRuns(input)), [input, result.error]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePresetClick = (expression: string) => {
    setInput(expression);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Cron Expression</label>
          <Tooltip content={copied ? "Copied!" : "Copy"}>
            <IconButton size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </IconButton>
          </Tooltip>
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="* * * * *"
          className={cn(
            "px-3 py-2 font-mono text-lg text-center",
            "bg-bg-primary border rounded-lg",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            result.error ? "border-red-500/50" : "border-border"
          )}
        />
      </div>

      {result.error ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{result.error}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/30">
          <Clock className="w-5 h-5 text-accent flex-shrink-0" />
          <span className="text-text-primary font-medium">{result.description}</span>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-bg-secondary border border-border">
        {CRON_FIELDS.map((field, i) => {
          const parts = input.trim().split(/\s+/);
          const value = parts[i] || "*";
          return (
            <div key={field.name} className="text-center">
              <div className="font-mono text-sm text-accent bg-bg-tertiary rounded px-2 py-1 mb-1">
                {value}
              </div>
              <div className="text-xs text-text-secondary">{field.name}</div>
              <div className="text-xs text-text-tertiary">{field.range}</div>
            </div>
          );
        })}
      </div>

      {nextRuns.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-tertiary uppercase tracking-wider">Next 5 Runs</div>
          <div className="flex flex-col gap-1">
            {nextRuns.map((run, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-bg-secondary text-sm">
                <span className="text-text-tertiary w-4">{i + 1}.</span>
                <span className="font-mono text-text-primary">{run.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs text-text-tertiary uppercase tracking-wider">Presets</div>
        <div className="flex flex-wrap gap-1">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.expression}
              onClick={() => handlePresetClick(preset.expression)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors",
                input === preset.expression
                  ? "bg-accent text-primary-950"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-hover"
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
