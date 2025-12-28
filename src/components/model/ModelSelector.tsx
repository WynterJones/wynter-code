import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Zap, Brain, Check, Cpu, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { ClaudeModel, CodexModel, AIModel, AIProvider } from "@/types";

interface ModelOption {
  value: AIModel;
  label: string;
  description: string;
  icon: typeof Sparkles;
  color: string;
}

const claudeModels: ModelOption[] = [
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

const codexModels: ModelOption[] = [
  {
    value: "gpt-5.2-codex",
    label: "Codex",
    description: "Latest GPT-5.2, balanced performance",
    icon: Cpu,
    color: "text-[#10a37f]",
  },
  {
    value: "gpt-5.1-codex-max",
    label: "Codex Max",
    description: "Maximum capability, best for complex tasks",
    icon: Rocket,
    color: "text-accent-blue",
  },
  {
    value: "gpt-5.1-codex-mini",
    label: "Codex Mini",
    description: "Fastest, best for simple tasks",
    icon: Zap,
    color: "text-accent-green",
  },
];

const geminiModels: ModelOption[] = [
  {
    value: "gemini-2.0-flash",
    label: "Flash",
    description: "Fast and efficient",
    icon: Zap,
    color: "text-[#4285f4]",
  },
  {
    value: "gemini-2.0-pro",
    label: "Pro",
    description: "More capable",
    icon: Brain,
    color: "text-[#4285f4]",
  },
];

function getModelsForProvider(provider: AIProvider): ModelOption[] {
  switch (provider) {
    case "codex":
      return codexModels;
    case "gemini":
      return geminiModels;
    case "claude":
    default:
      return claudeModels;
  }
}

function getDefaultModelForProvider(provider: AIProvider): AIModel {
  switch (provider) {
    case "codex":
      return "gpt-5.2-codex";
    case "gemini":
      return "gemini-2.0-flash";
    case "claude":
    default:
      return "claude-sonnet-4-20250514";
  }
}

interface ModelSelectorProps {
  projectId: string;
}

export function ModelSelector({ projectId }: ModelSelectorProps) {
  const { defaultModel, defaultCodexModel, setDefaultModel, setDefaultCodexModel } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Use selector to get current provider for this specific project
  const currentProvider = useSessionStore((state) => {
    const currentSessionId = state.activeSessionId.get(projectId);
    if (!currentSessionId) return "claude" as AIProvider;

    const projectSessions = state.sessions.get(projectId);
    const session = projectSessions?.find(s => s.id === currentSessionId);
    return (session?.provider || "claude") as AIProvider;
  });

  // Get models for the current provider
  const models = getModelsForProvider(currentProvider);

  // Get the current model based on provider
  const getCurrentModel = (): AIModel => {
    if (currentProvider === "codex") {
      return defaultCodexModel;
    }
    return defaultModel;
  };

  const currentModel = getCurrentModel();
  const selectedModel = models.find((m) => m.value === currentModel) || models[0];

  const handleModelSelect = (model: AIModel) => {
    if (currentProvider === "codex") {
      setDefaultCodexModel(model as CodexModel);
    } else {
      setDefaultModel(model as ClaudeModel);
    }
    setIsOpen(false);
  };

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
        <div className="absolute right-0 mt-1 w-64 py-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 dropdown-solid">
          {models.map((model) => (
            <button
              key={model.value}
              onClick={() => handleModelSelect(model.value)}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2 hover:bg-bg-hover transition-colors",
                currentModel === model.value && "bg-bg-hover"
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
              {currentModel === model.value && (
                <Check className="w-4 h-4 text-accent-green" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { getModelsForProvider, getDefaultModelForProvider };
