import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { Search, Terminal, FolderOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import type { SlashCommand } from "@/types/slashCommand";

const DROPDOWN_WIDTH = 360;
const DROPDOWN_MAX_HEIGHT = 320;
const VIEWPORT_PADDING = 8;

interface SlashCommandDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  commands: SlashCommand[];
  position: { top: number; left: number };
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
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

function getSourceIcon(source: SlashCommand["source"]) {
  switch (source) {
    case "builtin":
      return <Terminal className="w-3.5 h-3.5" />;
    case "project":
      return <FolderOpen className="w-3.5 h-3.5" />;
    case "personal":
      return <User className="w-3.5 h-3.5" />;
  }
}

export function SlashCommandDropdown({
  isOpen,
  searchQuery,
  commands,
  position,
  onSelect,
  onClose,
}: SlashCommandDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState<{
    top: number;
    left: number;
    showAbove: boolean;
  }>({ top: 0, left: 0, showAbove: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate viewport-aware position
  useLayoutEffect(() => {
    if (!isOpen) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate adjusted left position to stay within viewport
    let adjustedLeft = position.left;
    if (adjustedLeft + DROPDOWN_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      adjustedLeft = viewportWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING;
    }
    if (adjustedLeft < VIEWPORT_PADDING) {
      adjustedLeft = VIEWPORT_PADDING;
    }

    // Determine if we should show above or below
    const spaceBelow = viewportHeight - position.top;
    const spaceAbove = position.top;
    const showAbove =
      spaceBelow < DROPDOWN_MAX_HEIGHT + VIEWPORT_PADDING && spaceAbove > spaceBelow;

    // Calculate adjusted top position
    let adjustedTop: number;
    if (showAbove) {
      // Show above: position so bottom of dropdown is at the input position
      adjustedTop = position.top - DROPDOWN_MAX_HEIGHT - 8;
      if (adjustedTop < VIEWPORT_PADDING) {
        adjustedTop = VIEWPORT_PADDING;
      }
    } else {
      // Show below: use the provided position
      adjustedTop = position.top;
      // Ensure dropdown doesn't go off bottom of viewport
      if (adjustedTop + DROPDOWN_MAX_HEIGHT > viewportHeight - VIEWPORT_PADDING) {
        adjustedTop = viewportHeight - DROPDOWN_MAX_HEIGHT - VIEWPORT_PADDING;
      }
    }

    setAdjustedPosition({ top: adjustedTop, left: adjustedLeft, showAbove });
  }, [isOpen, position]);

  // Filter and score commands
  const filteredCommands = useMemo(() => {
    if (!searchQuery) {
      return commands.slice(0, 20).map((cmd) => ({ command: cmd, score: 0 }));
    }

    return commands
      .map((cmd) => {
        const nameMatch = fuzzyMatch(searchQuery, cmd.name);
        const descMatch = fuzzyMatch(searchQuery, cmd.description);
        const bestScore = Math.max(nameMatch.score * 2, descMatch.score);
        return {
          command: cmd,
          match: nameMatch.match || descMatch.match,
          score: bestScore,
        };
      })
      .filter((item) => item.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [commands, searchQuery]);

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
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Tab":
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].command);
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
  }, [isOpen, selectedIndex, filteredCommands, onSelect, onClose]);

  if (!isOpen || commands.length === 0) return null;

  // Show empty state when there are commands but no matches
  const showEmptyState = commands.length > 0 && filteredCommands.length === 0 && searchQuery.length > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50",
        "bg-bg-secondary border border-border rounded-lg shadow-xl",
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
      <div className="px-3 py-2 border-b border-border/50 bg-bg-tertiary/50">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Terminal className="w-3.5 h-3.5" />
          <span>Slash Commands</span>
          <span className="ml-auto opacity-60">{filteredCommands.length} commands</span>
        </div>
      </div>

      <ScrollArea className="max-h-[280px]">
        <div className="py-1">
          {showEmptyState ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-text-secondary">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No matching commands</p>
              <p className="text-xs opacity-70">Try a different search term</p>
            </div>
          ) : (
            filteredCommands.map((item, index) => (
              <button
                key={`${item.command.source}-${item.command.name}`}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2",
                  "text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent/10 text-text-primary"
                    : "text-text-secondary hover:bg-bg-hover"
                )}
                onClick={() => onSelect(item.command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0 text-text-secondary/60">
                  {getSourceIcon(item.command.source)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-accent text-xs">/{item.command.name}</span>
                    {item.command.argumentHint && (
                      <span className="text-[10px] text-text-secondary/50">
                        {item.command.argumentHint}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary/70 truncate">
                    {item.command.description}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      item.command.source === "builtin" && "bg-accent/10 text-accent",
                      item.command.source === "project" && "bg-green-500/10 text-green-400",
                      item.command.source === "personal" && "bg-purple-500/10 text-purple-400"
                    )}
                  >
                    {item.command.source}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
