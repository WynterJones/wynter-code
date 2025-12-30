import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Download } from "lucide-react";
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

interface ProviderSelectorProps {
  currentProvider: AIProvider;
  installedProviders: AIProvider[];
  onProviderChange: (provider: AIProvider) => void;
  disabled?: boolean;
}

export function ProviderSelector({
  currentProvider,
  installedProviders,
  onProviderChange,
  disabled = false,
}: ProviderSelectorProps) {
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

  const handleProviderSelect = (provider: AIProvider) => {
    if (installedProviders.includes(provider)) {
      onProviderChange(provider);
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2 h-7 rounded text-xs transition-colors",
          "bg-bg-tertiary border border-border/50 hover:border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title="Select AI provider"
      >
        <ProviderIcon provider={currentProvider} size={14} />
        <span className="text-text-primary">{getProviderLabel(currentProvider)}</span>
        <ChevronDown className={cn("w-3 h-3 text-text-secondary transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 dropdown-solid">
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
