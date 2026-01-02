import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTime: string;
  speakingTime: string;
}

function calculateStats(text: string): Stats {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim()).length;

  const lines = text.split("\n").length;

  const readingMinutes = words / 200;
  const speakingMinutes = words / 150;

  const formatTime = (minutes: number): string => {
    if (minutes < 1) {
      const seconds = Math.ceil(minutes * 60);
      return `${seconds} sec`;
    }
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs} sec`;
  };

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTime: formatTime(readingMinutes),
    speakingTime: formatTime(speakingMinutes),
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-bg-secondary border border-border">
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
      {sublabel && <span className="text-xs text-text-tertiary">{sublabel}</span>}
    </div>
  );
}

export function WordCounter() {
  const [input, setInput] = useState("");

  const stats = useMemo(() => calculateStats(input), [input]);

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Enter Text</label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear text">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or type your text here..."
          className={cn(
            "flex-1 min-h-[150px] resize-y text-sm",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Words" value={stats.words} />
        <StatCard label="Characters" value={stats.characters} sublabel={`${stats.charactersNoSpaces} without spaces`} />
        <StatCard label="Sentences" value={stats.sentences} />
        <StatCard label="Paragraphs" value={stats.paragraphs} />
        <StatCard label="Lines" value={stats.lines} />
        <StatCard label="Reading Time" value={stats.readingTime} sublabel="@ 200 wpm" />
        <StatCard label="Speaking Time" value={stats.speakingTime} sublabel="@ 150 wpm" />
      </div>
    </div>
  );
}
