import type { AIProvider } from "@/types";
import { ClaudeDropdown } from "@/components/claude";
import { CodexDropdown } from "@/components/codex";

interface ProviderDropdownProps {
  provider: AIProvider;
  projectPath: string;
}

export function ProviderDropdown({ provider, projectPath }: ProviderDropdownProps) {
  switch (provider) {
    case "codex":
      return <CodexDropdown />;
    case "claude":
    default:
      return <ClaudeDropdown projectPath={projectPath} />;
  }
}
