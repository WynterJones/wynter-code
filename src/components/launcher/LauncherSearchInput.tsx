import { useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { useLauncherStore, SearchMode } from "@/stores/launcherStore";
import { cn } from "@/lib/utils";

interface LauncherSearchInputProps {
  placeholder?: string;
  isLoading?: boolean;
}

const MODE_LABELS: Record<SearchMode, string> = {
  all: "All",
  apps: "Apps",
  tools: "Tools",
};

export function LauncherSearchInput({
  placeholder = "Search apps, tools, projects...",
  isLoading = false,
}: LauncherSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, searchMode, cycleSearchMode } = useLauncherStore();

  useEffect(() => {
    // Auto-focus and select all on mount with retries for reliability
    const focusAndSelect = () => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    };

    // Immediate focus
    focusAndSelect();

    // Retry focus after short delays to ensure window is ready
    const timers = [
      setTimeout(focusAndSelect, 50),
      setTimeout(focusAndSelect, 150),
      setTimeout(focusAndSelect, 300),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      cycleSearchMode();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <div className="relative w-5 h-5 flex-shrink-0">
        <Search
          className={cn(
            "w-5 h-5 text-text-secondary absolute inset-0 transition-opacity duration-150",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
        <Loader2
          className={cn(
            "w-5 h-5 text-accent absolute inset-0 animate-spin transition-opacity duration-150",
            isLoading ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary outline-none text-sm font-mono"
        autoFocus
      />

      <div className="flex items-center gap-1.5">
        <kbd className="text-[10px] text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded font-mono transition-colors">
          Tab
        </kbd>
        <span
          className={cn(
            "text-xs transition-colors duration-150",
            searchMode === "all" ? "text-text-secondary" : "text-accent"
          )}
        >
          {MODE_LABELS[searchMode]}
        </span>
      </div>
    </div>
  );
}
