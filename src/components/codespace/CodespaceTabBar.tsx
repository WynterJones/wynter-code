import { useRef, useState, useEffect } from "react";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FileIcon } from "@/components/files/FileIcon";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CodespaceTab } from "@/types/codespace";

interface CodespaceTabBarProps {
  tabs: CodespaceTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onOpenFile: () => void;
  isDropTarget?: boolean;
}

export function CodespaceTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenFile,
  isDropTarget,
}: CodespaceTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons);
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [tabs.length]);

  const scrollTabs = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      onCloseTab(tabId);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center h-9 border-b border-border bg-bg-secondary transition-all duration-200",
        isDropTarget && "bg-accent/8 border-accent/30 border-b-accent/40"
      )}
    >
      {/* Scroll left button */}
      {canScrollLeft && (
        <button
          onClick={() => scrollTabs("left")}
          className="flex-shrink-0 p-1 hover:bg-bg-hover text-text-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Tabs container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
            className={cn(
              "group relative flex items-center gap-1.5 px-3 h-9 border-r border-border cursor-pointer transition-colors min-w-0",
              activeTabId === tab.id
                ? "bg-bg-primary text-text-primary"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            {/* Active indicator */}
            {activeTabId === tab.id && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
            )}

            {/* File icon */}
            <FileIcon name={tab.fileName} isDirectory={false} className="w-4 h-4 flex-shrink-0" />

            {/* File name with dirty indicator */}
            <span className="text-sm truncate max-w-[120px]">
              {tab.isDirty && (
                <span className="text-accent mr-0.5">*</span>
              )}
              {tab.fileName}
            </span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={cn(
                "p-0.5 rounded hover:bg-bg-hover/80 text-text-secondary hover:text-text-primary transition-colors",
                "opacity-0 group-hover:opacity-100",
                activeTabId === tab.id && "opacity-100"
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Scroll right button */}
      {canScrollRight && (
        <button
          onClick={() => scrollTabs("right")}
          className="flex-shrink-0 p-1 hover:bg-bg-hover text-text-secondary"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Add file button */}
      <Tooltip content="Open File">
        <button
          onClick={onOpenFile}
          className="flex-shrink-0 p-2 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors border-l border-border"
        >
          <Plus className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}
