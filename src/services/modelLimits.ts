import type { AIProvider } from "@/types";

export interface ModelLimits {
  input: number;
  output: number;
}

/**
 * Context window and output limits by model.
 * Sources:
 * - Claude: https://platform.claude.com/docs/en/build-with-claude/context-windows
 * - OpenAI/Codex: https://platform.openai.com/docs/models
 * - Gemini: https://ai.google.dev/gemini-api/docs/models
 */
const MODEL_LIMITS: Record<string, ModelLimits> = {
  // Claude models
  "claude-opus-4-20250514": { input: 200_000, output: 64_000 },
  "claude-sonnet-4-20250514": { input: 200_000, output: 64_000 },
  "claude-3-5-haiku-20241022": { input: 200_000, output: 8_192 },

  // Codex models
  "gpt-5.2-codex": { input: 400_000, output: 128_000 },
  "gpt-5.1-codex-max": { input: 400_000, output: 128_000 },
  "gpt-5.1-codex-mini": { input: 192_000, output: 32_000 },

  // Gemini models
  "gemini-2.5-flash": { input: 1_048_576, output: 65_536 },
  "gemini-2.5-pro": { input: 1_048_576, output: 65_536 },
};

/**
 * Fallback defaults per provider when model is not found in lookup table.
 */
const PROVIDER_DEFAULTS: Record<AIProvider, ModelLimits> = {
  claude: { input: 200_000, output: 32_000 },
  codex: { input: 192_000, output: 32_000 },
  gemini: { input: 1_000_000, output: 65_536 },
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

/**
 * Get the input context limit for a model.
 */
export function getInputLimit(provider: AIProvider, model: string): number {
  return getModelLimits(provider, model).input;
}

/**
 * Get the output limit for a model.
 */
export function getOutputLimit(provider: AIProvider, model: string): number {
  return getModelLimits(provider, model).output;
}
