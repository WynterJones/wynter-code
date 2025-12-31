import { useMemo } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Loader2 } from "lucide-react";
import { LauncherItem } from "@/types/launcher";
import { LauncherResultItem } from "./LauncherResultItem";
import { useLauncherStore } from "@/stores/launcherStore";
import { SCROLLBAR_AUTO_HIDE_DELAY } from "@/lib/constants";

interface LauncherResultsListProps {
  results: LauncherItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onExecute: (item: LauncherItem) => void;
  isLoading?: boolean;
}

export function LauncherResultsList({
  results,
  selectedIndex,
  onSelect,
  onExecute,
  isLoading = false,
}: LauncherResultsListProps) {
  const { query } = useLauncherStore();

  // Group results by category
  const grouped = useMemo(() => {
    const groups: Record<string, LauncherItem[]> = {};
    results.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [results]);

  // Show loading state when searching and no results yet
  if (isLoading && results.length === 0 && query.length > 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-sm gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span>Searching...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        {query.length > 0 ? "No results found" : "Type to search..."}
      </div>
    );
  }

  let runningIndex = 0;

  return (
    <OverlayScrollbarsComponent
      className="flex-1 h-full"
      options={{
        scrollbars: {
          autoHide: "leave",
          autoHideDelay: SCROLLBAR_AUTO_HIDE_DELAY,
          theme: "os-theme-custom",
          visibility: "visible",
        },
        overflow: {
          x: "hidden",
          y: "scroll",
        },
      }}
    >
      <div className="p-2 pb-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-2">
            {/* Category header */}
            <div className="px-3 py-1.5 text-xs font-medium text-text-secondary uppercase tracking-wider">
              {category}
            </div>

            {/* Items */}
            {items.map((item) => {
              const globalIndex = runningIndex++;
              return (
                <LauncherResultItem
                  key={item.id}
                  item={item}
                  isSelected={selectedIndex === globalIndex}
                  onClick={() => {
                    onSelect(globalIndex);
                    onExecute(item);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </OverlayScrollbarsComponent>
  );
}
