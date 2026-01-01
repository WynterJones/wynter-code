import { useEffect } from "react";
import { Search, ChevronsUpDown, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tool, ToolCategory } from "./useToolsDropdown";

interface ToolsDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  dropdownPosition: { top: number; left: number };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  allCollapsed: boolean;
  onToggleAllCategories: () => void;
  categories: ToolCategory[];
  collapsedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  toolButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  highlightedIndex: number;
  navigableTools: Tool[];
  onHighlightChange: (index: number) => void;
}

export function ToolsDropdownMenu({
  isOpen,
  onClose,
  dropdownRef,
  dropdownPosition,
  searchQuery,
  onSearchChange,
  searchInputRef,
  allCollapsed,
  onToggleAllCategories,
  categories,
  collapsedCategories,
  onToggleCategory,
  toolButtonRefs,
  highlightedIndex,
  navigableTools,
  onHighlightChange,
}: ToolsDropdownMenuProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onHighlightChange(
          highlightedIndex < navigableTools.length - 1 ? highlightedIndex + 1 : highlightedIndex
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onHighlightChange(highlightedIndex > 0 ? highlightedIndex - 1 : highlightedIndex);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const tool = navigableTools[highlightedIndex];
        if (tool && !tool.disabled) {
          tool.onClick();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, highlightedIndex, navigableTools, onClose, onHighlightChange]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-64 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 dropdown-solid"
      style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
    >
      {/* Search Input */}
      <div className="p-2 border-b border-border">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <Tooltip content={allCollapsed ? "Expand all" : "Collapse all"}>
            <button
              onClick={onToggleAllCategories}
              className={cn(
                "p-1.5 rounded-md border border-border transition-colors",
                allCollapsed
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tools List */}
      <OverlayScrollbarsComponent
        options={{
          scrollbars: {
            theme: "os-theme-custom",
            autoHide: "leave",
            autoHideDelay: 100,
          },
        }}
        className="max-h-[400px] os-theme-custom"
      >
        <div>
          {categories.length === 0 ? (
            <div className="px-3 py-4 text-sm text-text-secondary text-center">
              No tools found
            </div>
          ) : (
            categories.map((category) => {
              const isCollapsed = collapsedCategories.has(category.id);
              return (
                <div key={category.id}>
                  {/* Category Header - full width, darker bg */}
                  <button
                    onClick={() => onToggleCategory(category.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-black/20 hover:bg-black/30 border-y border-border/50 transition-colors"
                  >
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 transition-transform",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                    <span>{category.label}</span>
                    <span className="ml-auto text-[10px] opacity-60">
                      {category.tools.length}
                    </span>
                  </button>
                  {/* Category Tools */}
                  {!isCollapsed && (
                    <div className="py-1">
                      {category.tools.map((tool) => {
                        const toolIndex = navigableTools.findIndex(
                          (t) => t.id === tool.id
                        );
                        const isHighlighted =
                          toolIndex !== -1 && toolIndex === highlightedIndex;
                        return (
                          <Tooltip
                            key={tool.id}
                            content={tool.description}
                            side="left"
                            wrapperClassName="block w-full"
                          >
                            <button
                              ref={(el) => {
                                toolButtonRefs.current[tool.id] = el;
                              }}
                              onClick={tool.onClick}
                              disabled={tool.disabled}
                              onMouseEnter={() => {
                                if (toolIndex !== -1) {
                                  onHighlightChange(toolIndex);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors group",
                                tool.disabled
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-bg-hover",
                                isHighlighted &&
                                  !tool.disabled &&
                                  "bg-accent/20",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex-shrink-0 text-text-secondary transition-colors",
                                  !tool.disabled && "group-hover:text-accent",
                                  isHighlighted && !tool.disabled && "text-accent",
                                )}
                              >
                                {tool.icon}
                              </div>
                              <span className="text-[13px] font-medium text-text-primary truncate">
                                {tool.name}
                              </span>
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </OverlayScrollbarsComponent>
    </div>,
    document.body,
  );
}
