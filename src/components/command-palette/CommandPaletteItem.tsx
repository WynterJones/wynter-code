import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { CommandItem } from "@/types";

interface CommandPaletteItemProps {
  item: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function CommandPaletteItem({ item, isSelected, onSelect }: CommandPaletteItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  return (
    <button
      ref={ref}
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
        "hover:bg-bg-hover group",
        isSelected && "bg-accent/20"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 text-text-secondary transition-colors",
          isSelected ? "text-accent" : "group-hover:text-accent"
        )}
      >
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm font-medium truncate",
            isSelected ? "text-accent" : "text-text-primary"
          )}
        >
          {item.label}
        </div>
        {item.description && (
          <div className="text-xs text-text-secondary truncate">{item.description}</div>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
          "bg-bg-tertiary text-text-secondary"
        )}
      >
        {item.type}
      </span>
    </button>
  );
}
