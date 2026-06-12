import type { AIProvider } from "@/types";

export interface ModelLimits {
  input: number;
  output: number;
}

/**
 * Context window and output limits by model.
 * Sources:
 * - Claude: https://docs.anthropic.com/en/docs/about-claude/models/overview
 * - OpenAI/Codex: https://developers.openai.com/codex/cli/
 *
 * Last updated: Dec 2025
 */
const MODEL_LIMITS: Record<string, ModelLimits> = {
  // Claude models (https://platform.claude.com/docs/en/about-claude/models/overview)
  "claude-fable-5": { input: 1_000_000, output: 128_000 },
  "claude-opus-4-8": { input: 1_000_000, output: 128_000 },
  "claude-sonnet-4-6": { input: 1_000_000, output: 64_000 },
  "claude-haiku-4-5": { input: 200_000, output: 64_000 },

  // OpenAI Codex models (from `codex app-server` model/list; GPT-5 family
  // natively supports 400K tokens)
  "gpt-5.5": { input: 400_000, output: 128_000 },
  "gpt-5.4": { input: 400_000, output: 128_000 },
  "gpt-5.4-mini": { input: 400_000, output: 128_000 },
  "gpt-5.3-codex-spark": { input: 400_000, output: 128_000 },
};

/**
 * Fallback defaults per provider when model is not found in lookup table.
 */
const PROVIDER_DEFAULTS: Record<AIProvider, ModelLimits> = {
  claude: { input: 200_000, output: 64_000 },
  codex: { input: 400_000, output: 128_000 },
};

/**
 * Get context window limits for a specific model.
 * Falls back to provider defaults if model is not found.
 */
export function getModelLimits(provider: AIProvider, model: string): ModelLimits {
  // Try exact model match
  if (model in MODEL_LIMITS) {
    return MODEL_LIMITS[model];
  }

  // Return provider default
  return PROVIDER_DEFAULTS[provider];
}

