import { Radio, Globe, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AudioSourceType } from "@/types/radio";

const SOURCE_OPTIONS: {
  id: AudioSourceType;
  name: string;
  icon: typeof Radio;
  description: string;
}[] = [
  {
    id: "nightride",
    name: "Nightride FM",
    icon: Radio,
    description: "Synthwave radio",
  },
  {
    id: "radiobrowser",
    name: "Radio Browser",
    icon: Globe,
    description: "Internet radio",
  },
  {
    id: "custom",
    name: "Custom Music",
    icon: FolderOpen,
    description: "Your MP3 folder",
  },
];

export function RadioSourceSelector() {
  const { audioSourceType, setAudioSourceType } = useSettingsStore();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">
        Audio Source
      </label>
      <div className="grid grid-cols-3 gap-2">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setAudioSourceType(option.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all",
              audioSourceType === option.id
                ? "border-accent bg-accent/10 text-text-primary"
                : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
            )}
          >
            <option.icon className="w-5 h-5" />
            <span className="font-medium text-xs">{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
