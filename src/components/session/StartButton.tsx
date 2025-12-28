import { useState, useRef, useEffect } from "react";
import { Play, Square, Loader2, ChevronDown, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderIcon, getProviderLabel } from "./ProviderIcon";
import type { AIProvider } from "@/types";

interface ProviderOption {
  value: AIProvider;
  description: string;
}

const providers: ProviderOption[] = [
  {
    value: "claude",
    description: "Claude Code by Anthropic",
  },
  {
    value: "codex",
    description: "Codex CLI by OpenAI",
  },
  {
    value: "gemini",
    description: "Gemini CLI by Google",
  },
];

interface StartButtonProps {
  onStart: () => void;
  onStop: () => void;
  onProviderChange: (provider: AIProvider) => void;
  currentProvider: AIProvider;
  installedProviders: AIProvider[];
  isStarting: boolean;
  isActive: boolean;
}

export function StartButton({
  onStart,
  onStop,
  onProviderChange,
  currentProvider,
  installedProviders,
  isStarting,
  isActive,
}: StartButtonProps) {
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

  const handleMainClick = () => {
    if (isActive) {
      onStop();
    } else if (!isStarting) {
      onStart();
    }
  };

  const handleProviderSelect = (provider: AIProvider) => {
    if (installedProviders.includes(provider)) {
      onProviderChange(provider);
      setIsOpen(false);
    }
  };

  // Determine button colors based on state
  const getButtonStyles = () => {
    if (isStarting) {
      return "bg-bg-tertiary border-yellow-500/50 text-yellow-400";
    }
    if (isActive) {
      return "bg-bg-tertiary border-accent-red/50 hover:border-accent-red hover:bg-accent-red/10 text-accent-red";
    }
    return "bg-bg-tertiary border-accent-green/50 hover:border-accent-green hover:bg-accent-green/10 text-accent-green";
  };

  return (
    <div ref={ref} className="relative flex">
      {/* Main button */}
      <button
        onClick={handleMainClick}
        disabled={isStarting}
        className={cn(
          "flex items-center gap-2 px-3 h-8 rounded-l-md text-sm border transition-colors",
          getButtonStyles(),
          isStarting && "cursor-not-allowed"
        )}
        title={isActive ? "Stop session" : `Start ${getProviderLabel(currentProvider)} session`}
      >
        {isStarting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isActive ? (
          <Square className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        <ProviderIcon provider={currentProvider} size={14} className="opacity-80" />
        <span>{isStarting ? "Starting..." : isActive ? "Stop" : "Start"}</span>
      </button>

      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center px-1.5 h-8 rounded-r-md text-sm border border-l-0 transition-colors",
          getButtonStyles(),
          "hover:bg-bg-hover"
        )}
        title="Select AI provider"
      >
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 dropdown-solid">
          <div className="px-3 py-1.5 text-xs text-text-secondary border-b border-border mb-1">
            AI Provider
          </div>
          {providers.map((provider) => {
            const isInstalled = installedProviders.includes(provider.value);
            const isSelected = currentProvider === provider.value;

            return (
              <button
                key={provider.value}
                onClick={() => handleProviderSelect(provider.value)}
                disabled={!isInstalled}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2 transition-colors",
                  isInstalled
                    ? "hover:bg-bg-hover cursor-pointer"
                    : "opacity-50 cursor-not-allowed",
                  isSelected && "bg-bg-hover"
                )}
              >
                <ProviderIcon
                  provider={provider.value}
                  size={16}
                  className={cn("mt-0.5", !isInstalled && "opacity-50")}
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {getProviderLabel(provider.value)}
                  </div>
                  <div className="text-[10px] text-text-secondary/70 truncate">
                    {provider.description}
                  </div>
                </div>
                {isSelected && isInstalled ? (
                  <Check className="w-4 h-4 text-accent-green mt-0.5" />
                ) : !isInstalled ? (
                  <div className="flex items-center gap-1 text-[10px] text-text-secondary mt-0.5">
                    <Download className="w-3 h-3" />
                    <span>Install</span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
