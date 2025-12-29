import type { AIProvider } from "@/types";
import { ClaudeDropdown } from "@/components/claude";
import { CodexDropdown } from "@/components/codex";
import { GeminiDropdown } from "@/components/gemini";

interface ProviderDropdownProps {
  provider: AIProvider;
  projectPath: string;
}

export function ProviderDropdown({ provider, projectPath }: ProviderDropdownProps) {
  switch (provider) {
    case "codex":
      return <CodexDropdown />;
    case "gemini":
      return <GeminiDropdown />;
    case "claude":
    default:
      return <ClaudeDropdown projectPath={projectPath} />;
  }
}

export function getProviderManagerLabel(provider: AIProvider): string {
  switch (provider) {
    case "codex":
      return "Codex Manager";
    case "gemini":
      return "Gemini Manager";
    case "claude":
    default:
      return "Claude Code Manager";
  }
}
