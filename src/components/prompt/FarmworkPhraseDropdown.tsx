import { useState, useEffect, useMemo, useLayoutEffect, useRef } from "react";
import { Search, Tractor } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import type { FarmworkPhrase, FarmworkPhraseCategory } from "@/types/farmworkPhrase";
import {
  FARMWORK_PHRASES,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/lib/farmworkPhrases";

const DROPDOWN_WIDTH = 360;
const DROPDOWN_MAX_HEIGHT = 320;
const VIEWPORT_PADDING = 8;

interface FarmworkPhraseDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  position: { top: number; left: number };
  onSelect: (phrase: FarmworkPhrase) => void;
  onClose: () => void;
  hasGarden: boolean;
  hasFarmhouse: boolean;
}

function fuzzyMatch(
  query: string,
  text: string
): { match: boolean; score: number } {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  if (textLower.includes(queryLower)) {
    return { match: true, score: 100 - textLower.indexOf(queryLower) };
  }

  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      score += consecutiveMatches * 2;
    } else {
      consecutiveMatches = 0;
    }
  }

  return {
    match: queryIndex === queryLower.length,
    score,
  };
}

export function FarmworkPhraseDropdown({
  isOpen,
  searchQuery,
  position,
  onSelect,
  onClose,
  hasGarden,
  hasFarmhouse,
}: FarmworkPhraseDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState<{
    top: number;
    left: number;
    showAbove: boolean;
  }>({ top: 0, left: 0, showAbove: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter phrases based on requirements and search
  const filteredPhrases = useMemo(() => {
    // First filter by requirements
    const availablePhrases = FARMWORK_PHRASES.filter((phrase) => {
      if (phrase.requiresGarden && !hasGarden) return false;
      if (phrase.requiresFarmhouse && !hasFarmhouse) return false;
      return true;
    });

    if (!searchQuery) {
      return availablePhrases.map((phrase) => ({ phrase, score: 0 }));
    }

    return availablePhrases
      .map((p) => {
        const phraseMatch = fuzzyMatch(searchQuery, p.phrase);
        const descMatch = fuzzyMatch(searchQuery, p.description);
        const bestScore = Math.max(phraseMatch.score * 2, descMatch.score);
        return {
          phrase: p,
          match: phraseMatch.match || descMatch.match,
          score: bestScore,
        };
      })
      .filter((item) => item.match)
      .sort((a, b) => b.score - a.score);
  }, [searchQuery, hasGarden, hasFarmhouse]);

  // Group phrases by category
  const groupedPhrases = useMemo(() => {
    const groups: Map<FarmworkPhraseCategory, typeof filteredPhrases> =
      new Map();

    for (const item of filteredPhrases) {
      const category = item.phrase.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }

    // Return in category order
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      phrases: groups.get(cat)!,
    }));
  }, [filteredPhrases]);

  // Flatten for keyboard navigation
  const flattenedPhrases = useMemo(
    () => filteredPhrases.map((item) => item.phrase),
    [filteredPhrases]
  );

  // Calculate viewport-aware position
  useLayoutEffect(() => {
    if (!isOpen) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedLeft = position.left;
    if (adjustedLeft + DROPDOWN_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      adjustedLeft = viewportWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING;
    }
    if (adjustedLeft < VIEWPORT_PADDING) {
      adjustedLeft = VIEWPORT_PADDING;
    }

    const spaceBelow = viewportHeight - position.top;
    const spaceAbove = position.top;
    const showAbove =
      spaceBelow < DROPDOWN_MAX_HEIGHT + VIEWPORT_PADDING &&
      spaceAbove > spaceBelow;

    let adjustedTop: number;
    if (showAbove) {
      adjustedTop = position.top - DROPDOWN_MAX_HEIGHT - 8;
      if (adjustedTop < VIEWPORT_PADDING) {
        adjustedTop = VIEWPORT_PADDING;
      }
    } else {
      adjustedTop = position.top;
      if (adjustedTop + DROPDOWN_MAX_HEIGHT > viewportHeight - VIEWPORT_PADDING) {
        adjustedTop = viewportHeight - DROPDOWN_MAX_HEIGHT - VIEWPORT_PADDING;
      }
    }

    setAdjustedPosition({ top: adjustedTop, left: adjustedLeft, showAbove });
  }, [isOpen, position]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flattenedPhrases.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Tab":
        case "Enter":
          e.preventDefault();
          if (flattenedPhrases[selectedIndex]) {
            onSelect(flattenedPhrases[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, flattenedPhrases, onSelect, onClose]);

  if (!isOpen) return null;

  const showEmptyState = filteredPhrases.length === 0 && searchQuery.length > 0;

  // Track index across groups for selection
  let currentIndex = 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50",
        "bg-bg-secondary border border-border rounded-lg shadow-xl dropdown-solid",
        "overflow-hidden",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        adjustedPosition.showAbove ? "origin-bottom" : "origin-top"
      )}
      style={{
        top: adjustedPosition.top,
        left: adjustedPosition.left,
        width: DROPDOWN_WIDTH,
        maxHeight: DROPDOWN_MAX_HEIGHT,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-[#181825]">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Tractor className="w-3.5 h-3.5 text-[#a6e3a1]" />
          <span>Farmwork Phrases</span>
          <span className="ml-auto text-text-secondary/60">
            {filteredPhrases.length} phrases
          </span>
        </div>
      </div>

      <ScrollArea className="max-h-[280px]">
        <div className="py-1">
          {showEmptyState ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-text-secondary">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No matching phrases</p>
              <p className="text-xs opacity-70">Try a different search term</p>
            </div>
          ) : (
            groupedPhrases.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="px-3 py-1.5 text-[10px] font-medium text-[#6c7086] bg-[#181825] sticky top-0 z-10 uppercase tracking-wider border-b border-[#313244]">
                  {group.label}
                </div>

                {/* Phrases in category */}
                {group.phrases.map((item) => {
                  const index = currentIndex++;
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={item.phrase.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2",
                        "text-left text-sm transition-colors",
                        isSelected
                          ? "bg-[#313244] text-[#cdd6f4]"
                          : "text-[#a6adc8] hover:bg-[#1e1e2e]"
                      )}
                      onClick={() => onSelect(item.phrase)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div
                        className={cn(
                          "w-0.5 h-8 rounded-full transition-colors",
                          isSelected ? "bg-[#a6e3a1]" : "bg-[#45475a]"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-mono text-xs",
                            isSelected ? "text-[#a6e3a1]" : "text-[#94e2d5]"
                          )}>
                            "{item.phrase.phrase}"
                          </span>
                          {item.phrase.argumentHint && (
                            <span className="text-[10px] text-[#6c7086]">
                              {item.phrase.argumentHint}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6c7086] truncate">
                          {item.phrase.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
