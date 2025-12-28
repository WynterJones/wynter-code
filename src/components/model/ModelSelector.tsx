import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Zap, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ClaudeModel } from "@/types";

interface ModelOption {
  value: ClaudeModel;
  label: string;
  description: string;
  icon: typeof Sparkles;
  color: string;
}

const models: ModelOption[] = [
  {
    value: "claude-opus-4-20250514",
    label: "Opus",
    description: "Most capable, best for complex tasks",
    icon: Brain,
    color: "text-accent-blue",
  },
  {
    value: "claude-sonnet-4-20250514",
    label: "Sonnet",
    description: "Best balance of speed and quality",
    icon: Sparkles,
    color: "text-accent-purple",
  },
  {
    value: "claude-3-5-haiku-20241022",
    label: "Haiku",
    description: "Fastest, best for simple tasks",
    icon: Zap,
    color: "text-accent-green",
  },
];

export function ModelSelector() {
  const { defaultModel, setDefaultModel } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.value === defaultModel) || models[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 h-8 rounded-md text-sm",
          "bg-bg-tertiary border border-border hover:bg-bg-hover transition-colors"
        )}
      >
        <selectedModel.icon className={cn("w-3.5 h-3.5", selectedModel.color)} />
        <span className="text-text-primary">{selectedModel.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50">
          {models.map((model) => (
            <button
              key={model.value}
              onClick={() => {
                setDefaultModel(model.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2 hover:bg-bg-hover transition-colors",
                defaultModel === model.value && "bg-bg-hover"
              )}
            >
              <model.icon className={cn("w-4 h-4 mt-0.5", model.color)} />
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {model.label}
                </div>
                <div className="text-[10px] text-text-secondary/70 truncate">
                  {model.description}
                </div>
              </div>
              {defaultModel === model.value && (
                <Check className="w-4 h-4 text-accent-green" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
