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
 * - Gemini: https://ai.google.dev/gemini-api/docs/models
 *
 * Last updated: Dec 2025
 */
const MODEL_LIMITS: Record<string, ModelLimits> = {
  // Claude models (https://docs.anthropic.com/en/docs/about-claude/models/overview)
  // Opus 4: 200K context, 32K max output
  // Sonnet 4: 200K context (1M in beta), 64K max output
  // Haiku 3.5: 200K context, 8K max output
  "claude-opus-4-20250514": { input: 200_000, output: 32_000 },
  "claude-sonnet-4-20250514": { input: 200_000, output: 64_000 },
  "claude-3-5-haiku-20241022": { input: 200_000, output: 8_192 },

  // OpenAI Codex models (https://developers.openai.com/codex/cli/)
  // GPT-5 natively supports 400K tokens
  // Codex-Max uses compaction for multi-million token sessions
  // Codex-Mini is optimized for speed with smaller context
  "gpt-5.2-codex": { input: 400_000, output: 128_000 },
  "gpt-5.1-codex-max": { input: 400_000, output: 128_000 },
  "gpt-5.1-codex-mini": { input: 192_000, output: 32_000 },

  // Gemini models (https://ai.google.dev/gemini-api/docs/models)
  // Both Pro and Flash support 1M+ token context windows
  // Max output: 65,536 tokens
  "gemini-2.5-flash": { input: 1_048_576, output: 65_536 },
  "gemini-2.5-pro": { input: 1_048_576, output: 65_536 },
};

/**
 * Fallback defaults per provider when model is not found in lookup table.
 */
const PROVIDER_DEFAULTS: Record<AIProvider, ModelLimits> = {
  claude: { input: 200_000, output: 32_000 },
  codex: { input: 400_000, output: 128_000 },
  gemini: { input: 1_048_576, output: 65_536 },
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
