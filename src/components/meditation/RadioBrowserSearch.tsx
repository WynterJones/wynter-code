import { useState, useCallback } from "react";
import { Search, Heart, Loader2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Input } from "@/components/ui/Input";
import { useSettingsStore } from "@/stores/settingsStore";
import { searchRadioStations, getTopStations } from "@/services/radioBrowser";
import type { RadioBrowserStation, RadioBrowserFavorite } from "@/types/radio";

export function RadioBrowserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RadioBrowserStation[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    radioBrowserFavorites,
    currentRadioBrowserStation,
    addRadioBrowserFavorite,
    removeRadioBrowserFavorite,
    setCurrentRadioBrowserStation,
  } = useSettingsStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      // Show top stations if no query
      setSearching(true);
      setError(null);
      try {
        const stations = await getTopStations(25);
        setResults(stations);
      } catch (err) {
        setError(String(err));
      } finally {
        setSearching(false);
      }
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const stations = await searchRadioStations({
        name: query.trim(),
        limit: 25,
      });
      setResults(stations);
    } catch (err) {
      setError(String(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelectStation = (station: RadioBrowserStation) => {
    const favorite: RadioBrowserFavorite = {
      stationuuid: station.stationuuid,
      name: station.name,
      streamUrl: station.url_resolved || station.url,
      favicon: station.favicon,
      tags: station.tags,
    };
    setCurrentRadioBrowserStation(favorite);
  };

  const handleSelectFavorite = (station: RadioBrowserFavorite) => {
    setCurrentRadioBrowserStation(station);
  };

  const toggleFavorite = (station: RadioBrowserStation, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFavorite = radioBrowserFavorites.some(
      (f) => f.stationuuid === station.stationuuid
    );

    if (isFavorite) {
      removeRadioBrowserFavorite(station.stationuuid);
    } else {
      addRadioBrowserFavorite({
        stationuuid: station.stationuuid,
        name: station.name,
        streamUrl: station.url_resolved || station.url,
        favicon: station.favicon,
        tags: station.tags,
      });
    }
  };

  const removeFavorite = (stationuuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRadioBrowserFavorite(stationuuid);
  };

  const isFavorite = (stationuuid: string) =>
    radioBrowserFavorites.some((f) => f.stationuuid === stationuuid);

  const isSelected = (stationuuid: string) =>
    currentRadioBrowserStation?.stationuuid === stationuuid;

  return (
    <div className="space-y-4">
      {/* Favorites Section */}
      {radioBrowserFavorites.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent-red" />
            Favorites
          </label>
          <div className="flex flex-wrap gap-2">
            {radioBrowserFavorites.map((station) => (
              <button
                key={station.stationuuid}
                onClick={() => handleSelectFavorite(station)}
                className={cn(
                  "group relative px-3 py-1.5 rounded-full text-xs border transition-all",
                  isSelected(station.stationuuid)
                    ? "border-accent bg-accent/20 text-text-primary"
                    : "border-border hover:border-accent/50 text-text-secondary"
                )}
              >
                {station.name}
                <button
                  onClick={(e) => removeFavorite(station.stationuuid, e)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-red text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary">
          Search Stations
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name..."
              className="pl-9"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && <p className="text-xs text-accent-red">{error}</p>}

      {results.length > 0 && (
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-2">
            {results.map((station) => (
              <div
                key={station.stationuuid}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                  isSelected(station.stationuuid)
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:bg-bg-hover"
                )}
                onClick={() => handleSelectStation(station)}
              >
                {station.favicon ? (
                  <img
                    src={station.favicon}
                    alt=""
                    className="w-6 h-6 rounded object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Globe className="w-6 h-6 text-text-secondary" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {station.name}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {station.tags || station.country}
                  </div>
                </div>
                <button
                  onClick={(e) => toggleFavorite(station, e)}
                  className="p-1 hover:bg-bg-hover rounded"
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isFavorite(station.stationuuid)
                        ? "text-accent-red fill-accent-red"
                        : "text-text-secondary hover:text-accent-red"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {results.length === 0 && !searching && !error && (
        <p className="text-xs text-text-secondary text-center py-4">
          Click Search to find stations, or search for a specific name
        </p>
      )}
    </div>
  );
}
