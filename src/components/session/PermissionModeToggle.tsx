import { useState, useRef, useEffect } from "react";
import { Shield, ShieldCheck, ShieldAlert, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/types";

interface PermissionModeToggleProps {
  mode: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  className?: string;
}

const modeConfig: Record<
  PermissionMode,
  { icon: typeof Shield; label: string; color: string; description: string }
> = {
  default: {
    icon: Shield,
    label: "Manual",
    color: "text-accent-blue",
    description: "Ask before each action",
  },
  plan: {
    icon: FileText,
    label: "Plan",
    color: "text-accent-yellow",
    description: "Plan mode - no execution",
  },
  acceptEdits: {
    icon: ShieldCheck,
    label: "Auto",
    color: "text-accent-green",
    description: "Auto-accept file edits",
  },
  bypassPermissions: {
    icon: ShieldAlert,
    label: "Bypass",
    color: "text-accent-red",
    description: "Skip all permissions (dangerous)",
  },
};

export function PermissionModeToggle({
  mode,
  onChange,
  className,
}: PermissionModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentConfig = modeConfig[mode];
  const Icon = currentConfig.icon;

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
          "bg-bg-tertiary border border-border hover:bg-bg-hover transition-colors",
          currentConfig.color
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{currentConfig.label}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 py-1 bg-bg-secondary border border-border rounded-lg shadow-lg z-50">
          {(Object.keys(modeConfig) as PermissionMode[]).map((modeKey) => {
            const config = modeConfig[modeKey];
            const ModeIcon = config.icon;
            const isSelected = mode === modeKey;

            return (
              <button
                key={modeKey}
                onClick={() => {
                  onChange(modeKey);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors",
                  isSelected && "bg-bg-hover"
                )}
              >
                <ModeIcon className={cn("w-4 h-4", config.color)} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium", config.color)}>
                    {config.label}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {config.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
