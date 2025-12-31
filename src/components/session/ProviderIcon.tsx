import type { AIProvider } from "@/types";
import { cn } from "@/lib/utils";

interface ProviderIconProps {
  provider: AIProvider;
  size?: number;
  className?: string;
}

const providerConfig: Record<AIProvider, {
  src: string;
  label: string;
}> = {
  claude: {
    src: "/claude-color.svg",
    label: "Claude",
  },
  codex: {
    src: "/openai-white.svg",
    label: "Codex",
  },
  gemini: {
    src: "/gemini-color.svg",
    label: "Gemini",
  },
};

export function ProviderIcon({ provider, size = 16, className }: ProviderIconProps) {
  const config = providerConfig[provider];
  return (
    <img
      src={config.src}
      alt={config.label}
      width={size}
      height={size}
      className={cn("inline-block", className)}
    />
  );
}

export function getProviderLabel(provider: AIProvider): string {
  return providerConfig[provider].label;
}
