import { useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";
import { useCommandItems, filterCommandItems } from "@/hooks/useCommandItems";
import { CommandPaletteItem } from "./CommandPaletteItem";
import { ScrollArea } from "@/components/ui";
import type { CommandItem } from "@/types";

export function CommandPalette() {
  const { isOpen, query, selectedIndex, close, setQuery, setTotalItems, selectNext, selectPrevious } =
    useCommandPaletteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allItems = useCommandItems();
  const filteredItems = useMemo(() => filterCommandItems(allItems, query), [allItems, query]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Update total items count when filtered items change
  useEffect(() => {
    setTotalItems(filteredItems.length);
  }, [filteredItems.length, setTotalItems]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "Tab":
          if (!e.shiftKey) {
            e.preventDefault();
            selectNext();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          selectPrevious();
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            close();
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        selectPrevious();
      }
    },
    [filteredItems, selectedIndex, selectNext, selectPrevious, close]
  );

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  if (!isOpen) return null;

  // Track running index for selection across groups
  let runningIndex = 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/50 animate-in fade-in-0 duration-100">
      <div
        ref={containerRef}
        role="dialog"
        aria-label="Command palette"
        className="w-[500px] max-h-[400px] bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, projects, sessions..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-secondary outline-none text-sm"
          />
          <kbd className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[320px]">
          <div className="p-2" role="listbox">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-8 text-center text-text-secondary text-sm">
                No results found
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-xs font-medium text-text-secondary uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((item) => {
                    const currentIndex = runningIndex;
                    runningIndex++;
                    return (
                      <CommandPaletteItem
                        key={item.id}
                        item={item}
                        isSelected={selectedIndex === currentIndex}
                        onSelect={() => {
                          item.action();
                          close();
                        }}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body
  );
}
