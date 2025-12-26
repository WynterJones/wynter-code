import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LauncherItem } from "@/types/launcher";

interface LauncherResultItemProps {
  item: LauncherItem;
  isSelected: boolean;
  onClick: () => void;
}

export function LauncherResultItem({
  item,
  isSelected,
  onClick,
}: LauncherResultItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const isApp = item.type === "application";

  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 rounded-lg text-left",
        "transition-all duration-100 ease-out",
        isApp ? "py-2.5" : "py-2",
        isSelected
          ? "bg-accent/20 shadow-sm shadow-accent/10"
          : "hover:bg-bg-hover"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          "transition-colors duration-100",
          isApp ? "w-10 h-10" : "w-8 h-8",
          // Only show bg for non-apps or apps without icons
          typeof item.icon !== "string" && (isSelected ? "bg-accent/30" : "bg-bg-tertiary")
        )}
      >
        {typeof item.icon === "string" ? (
          <img
            src={item.icon}
            className={cn("rounded", isApp ? "w-10 h-10" : "w-5 h-5")}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span
            className={cn("text-text-secondary", isSelected && "text-accent")}
          >
            {item.icon}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-medium truncate",
            isApp ? "text-base" : "text-sm",
            isSelected ? "text-accent" : "text-text-primary"
          )}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div className="text-xs text-text-secondary truncate">
            {item.subtitle}
          </div>
        )}
      </div>

      {/* Type badge - hidden for apps since the icon is enough context */}
      {!isApp && (
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors duration-100",
            isSelected ? "bg-accent/30 text-accent" : "bg-bg-tertiary text-text-secondary"
          )}
        >
          {item.type === "system-setting"
            ? "Settings"
            : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </span>
      )}
    </button>
  );
}
