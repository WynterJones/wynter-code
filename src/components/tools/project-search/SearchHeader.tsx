import { useRef, useEffect, useState } from "react";
import {
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  CaseSensitive,
  Regex,
  WholeWord,
  Loader2,
  X,
} from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  replaceText: string;
  onReplaceTextChange: (text: string) => void;
  showReplace: boolean;
  onToggleReplace: () => void;
  currentMatch: number;
  totalMatches: number;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  isSearching: boolean;
  caseSensitive: boolean;
  regexMode: boolean;
  wholeWord: boolean;
  onToggleCaseSensitive: () => void;
  onToggleRegex: () => void;
  onToggleWholeWord: () => void;
  onSearch: () => void;
  onReplaceInFile?: () => void;
  onReplaceAll?: () => void;
  fileExtensionFilter: string;
  onFileExtensionFilterChange: (filter: string) => void;
}

export function SearchHeader({
  query,
  onQueryChange,
  replaceText,
  onReplaceTextChange,
  showReplace,
  onToggleReplace,
  currentMatch,
  totalMatches,
  onNavigatePrev,
  onNavigateNext,
  isSearching,
  caseSensitive,
  regexMode,
  wholeWord,
  onToggleCaseSensitive,
  onToggleRegex,
  onToggleWholeWord,
  onSearch,
  onReplaceInFile,
  onReplaceAll,
  fileExtensionFilter,
  onFileExtensionFilterChange,
}: SearchHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchHovered, setIsSearchHovered] = useState(false);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        onNavigatePrev();
      } else {
        onSearch();
      }
    } else if (e.key === "Escape") {
      // Clear search
      onQueryChange("");
    }
  };

  const handleClearSearch = () => {
    onQueryChange("");
    searchInputRef.current?.focus();
  };

  return (
    <div className="p-3 border-b border-border space-y-2">
      {/* Search Row */}
      <div className="flex items-center gap-2">
        <div
          className="relative flex-1"
          onMouseEnter={() => setIsSearchHovered(true)}
          onMouseLeave={() => setIsSearchHovered(false)}
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in project... (Enter to search)"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full pl-8 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
              query && isSearchHovered ? "pr-28" : "pr-20"
            )}
          />

          {/* Clear button - shows on hover when there's text */}
          {query && isSearchHovered && (
            <button
              onClick={handleClearSearch}
              className="absolute right-[72px] top-1/2 -translate-y-1/2 p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search options inline */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <Tooltip content="Case Sensitive">
              <button
                onClick={onToggleCaseSensitive}
                className={cn(
                  "p-1 rounded hover:bg-bg-hover transition-colors",
                  caseSensitive
                    ? "text-accent bg-accent/10"
                    : "text-text-secondary"
                )}
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Use Regex">
              <button
                onClick={onToggleRegex}
                className={cn(
                  "p-1 rounded hover:bg-bg-hover transition-colors",
                  regexMode ? "text-accent bg-accent/10" : "text-text-secondary"
                )}
              >
                <Regex className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Whole Word">
              <button
                onClick={onToggleWholeWord}
                className={cn(
                  "p-1 rounded hover:bg-bg-hover transition-colors",
                  wholeWord ? "text-accent bg-accent/10" : "text-text-secondary"
                )}
              >
                <WholeWord className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
          ) : (
            <span className="text-xs text-text-secondary min-w-[50px] text-center">
              {totalMatches > 0
                ? `${currentMatch + 1}/${totalMatches}`
                : "0/0"}
            </span>
          )}

          <IconButton
            size="sm"
            onClick={onNavigatePrev}
            disabled={totalMatches === 0}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            onClick={onNavigateNext}
            disabled={totalMatches === 0}
            title="Next match (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </IconButton>

          <Tooltip content={showReplace ? "Hide Replace" : "Show Replace"}>
            <button
              onClick={onToggleReplace}
              className={cn(
                "p-1.5 rounded hover:bg-bg-hover transition-colors",
                showReplace
                  ? "text-accent bg-accent/10"
                  : "text-text-secondary"
              )}
            >
              <Replace className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Replace Row */}
      {showReplace && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Replace className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>

          <button
            onClick={onReplaceInFile}
            disabled={totalMatches === 0 || !replaceText}
            className="px-2 py-1.5 text-xs font-medium bg-bg-tertiary hover:bg-bg-hover border border-border rounded-md text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Replace
          </button>
          <button
            onClick={onReplaceAll}
            disabled={totalMatches === 0 || !replaceText}
            className="px-2 py-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-md text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Replace All
          </button>
        </div>
      )}

      {/* File Filter Row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary uppercase">
          Filter:
        </span>
        <input
          type="text"
          placeholder="*.ts, *.tsx, *.js"
          value={fileExtensionFilter}
          onChange={(e) => onFileExtensionFilterChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs bg-bg-primary border border-border rounded text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50"
        />
        {fileExtensionFilter && (
          <IconButton
            size="sm"
            onClick={() => onFileExtensionFilterChange("")}
            title="Clear filter"
          >
            <X className="w-3 h-3" />
          </IconButton>
        )}
      </div>
    </div>
  );
}
