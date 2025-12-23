import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { NIGHTRIDE_STATIONS } from "./radioStations";

export function NightrideStationSelector() {
  const { nightrideStation, setNightrideStation } = useSettingsStore();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">
        Nightride Station
      </label>
      <div className="grid grid-cols-2 gap-2">
        {NIGHTRIDE_STATIONS.map((station) => (
          <button
            key={station.id}
            onClick={() => setNightrideStation(station.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
              nightrideStation === station.id
                ? "border-accent bg-accent/10 text-text-primary"
                : "border-border hover:border-accent/50 text-text-secondary hover:text-text-primary"
            )}
          >
            <Radio className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{station.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
