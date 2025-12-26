import { useState, useRef, useEffect } from "react";
import { ShieldCheck, ShieldAlert, FileText, ChevronDown, Check, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/types";

interface PermissionModeToggleProps {
  mode: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  className?: string;
}

interface ModeOption {
  value: PermissionMode;
  icon: typeof ShieldCheck;
  label: string;
  color: string;
  description: string;
}

// Order: Manual, Auto, Bypass, Plan
const modeOptions: ModeOption[] = [
  {
    value: "manual",
    icon: ShieldQuestion,
    label: "Manual",
    color: "text-accent-blue",
    description: "Approve each tool manually",
  },
  {
    value: "acceptEdits",
    icon: ShieldCheck,
    label: "Auto",
    color: "text-accent-green",
    description: "Auto-accept file edits",
  },
  {
    value: "bypassPermissions",
    icon: ShieldAlert,
    label: "Bypass",
    color: "text-accent-red",
    description: "Skip all permissions",
  },
  {
    value: "plan",
    icon: FileText,
    label: "Plan",
    color: "text-accent-yellow",
    description: "Plan mode - no execution",
  },
];

export function PermissionModeToggle({
  mode,
  onChange,
  className,
}: PermissionModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find the selected mode, fallback to Auto if current mode isn't in options
  const selectedMode = modeOptions.find((m) => m.value === mode) || modeOptions[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 h-8 rounded-md text-sm",
          "bg-bg-tertiary border border-border hover:bg-bg-hover transition-colors"
        )}
      >
        <selectedMode.icon className={cn("w-3.5 h-3.5", selectedMode.color)} />
        <span className="text-text-primary">{selectedMode.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2 hover:bg-bg-hover transition-colors",
                mode === option.value && "bg-bg-hover"
              )}
            >
              <option.icon className={cn("w-4 h-4 mt-0.5", option.color)} />
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {option.label}
                </div>
                <div className="text-[10px] text-text-secondary/70 truncate">
                  {option.description}
                </div>
              </div>
              {mode === option.value && (
                <Check className="w-4 h-4 text-accent-green" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
