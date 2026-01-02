import { describe, it, expect } from "vitest";
import { getModelLimits } from "./modelLimits";

describe("getModelLimits", () => {
  describe("Claude models", () => {
    it("should return correct limits for claude-opus-4-20250514", () => {
      const limits = getModelLimits("claude", "claude-opus-4-20250514");
      expect(limits).toEqual({ input: 200_000, output: 32_000 });
    });

    it("should return correct limits for claude-sonnet-4-20250514", () => {
      const limits = getModelLimits("claude", "claude-sonnet-4-20250514");
      expect(limits).toEqual({ input: 200_000, output: 64_000 });
    });

    it("should return correct limits for claude-3-5-haiku-20241022", () => {
      const limits = getModelLimits("claude", "claude-3-5-haiku-20241022");
      expect(limits).toEqual({ input: 200_000, output: 8_192 });
    });

    it("should return Claude provider default for unknown Claude model", () => {
      const limits = getModelLimits("claude", "claude-unknown-model");
      expect(limits).toEqual({ input: 200_000, output: 32_000 });
    });

    it("should return Claude provider default for empty model string", () => {
      const limits = getModelLimits("claude", "");
      expect(limits).toEqual({ input: 200_000, output: 32_000 });
    });
  });

  describe("Codex models", () => {
    it("should return correct limits for gpt-5.2-codex", () => {
      const limits = getModelLimits("codex", "gpt-5.2-codex");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return correct limits for gpt-5.1-codex-max", () => {
      const limits = getModelLimits("codex", "gpt-5.1-codex-max");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return correct limits for gpt-5.1-codex-mini", () => {
      const limits = getModelLimits("codex", "gpt-5.1-codex-mini");
      expect(limits).toEqual({ input: 192_000, output: 32_000 });
    });

    it("should return Codex provider default for unknown Codex model", () => {
      const limits = getModelLimits("codex", "gpt-5.3-codex-unknown");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return Codex provider default for empty model string", () => {
      const limits = getModelLimits("codex", "");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });
  });

  describe("Gemini models", () => {
    it("should return correct limits for gemini-2.5-flash", () => {
      const limits = getModelLimits("gemini", "gemini-2.5-flash");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });

    it("should return correct limits for gemini-2.5-pro", () => {
      const limits = getModelLimits("gemini", "gemini-2.5-pro");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });

    it("should return correct limits for gemini-3-flash-preview", () => {
      const limits = getModelLimits("gemini", "gemini-3-flash-preview");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });

    it("should return correct limits for gemini-3-pro-preview", () => {
      const limits = getModelLimits("gemini", "gemini-3-pro-preview");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });

    it("should return Gemini provider default for unknown Gemini model", () => {
      const limits = getModelLimits("gemini", "gemini-4-unknown");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });

    it("should return Gemini provider default for empty model string", () => {
      const limits = getModelLimits("gemini", "");
      expect(limits).toEqual({ input: 1_048_576, output: 65_536 });
    });
  });

  describe("Provider defaults", () => {
    it("should return Claude provider default when model not found", () => {
      const limits = getModelLimits("claude", "some-random-model");
      expect(limits.input).toBe(200_000);
      expect(limits.output).toBe(32_000);
    });

    it("should return Codex provider default when model not found", () => {
      const limits = getModelLimits("codex", "some-random-model");
      expect(limits.input).toBe(400_000);
      expect(limits.output).toBe(128_000);
    });

    it("should return Gemini provider default when model not found", () => {
      const limits = getModelLimits("gemini", "some-random-model");
      expect(limits.input).toBe(1_048_576);
      expect(limits.output).toBe(65_536);
    });
  });

  describe("Return value structure", () => {
    it("should always return an object with input and output properties", () => {
      const limits = getModelLimits("claude", "claude-opus-4-20250514");
      expect(limits).toHaveProperty("input");
      expect(limits).toHaveProperty("output");
    });

    it("should return numeric values for input and output", () => {
      const limits = getModelLimits("claude", "claude-opus-4-20250514");
      expect(typeof limits.input).toBe("number");
      expect(typeof limits.output).toBe("number");
    });

    it("should return positive numbers for all limits", () => {
      const limits = getModelLimits("gemini", "gemini-2.5-pro");
      expect(limits.input).toBeGreaterThan(0);
      expect(limits.output).toBeGreaterThan(0);
    });

    it("should return input limits greater than output limits", () => {
      const limits = getModelLimits("claude", "claude-opus-4-20250514");
      expect(limits.input).toBeGreaterThan(limits.output);
    });
  });

  describe("Edge cases", () => {
    it("should handle case-sensitive model names", () => {
      // Model names are case-sensitive, so wrong case should fall back to provider default
      const limits = getModelLimits("claude", "CLAUDE-OPUS-4-20250514");
      expect(limits).toEqual({ input: 200_000, output: 32_000 }); // Falls back to default
    });

    it("should handle whitespace in model names", () => {
      const limits = getModelLimits("claude", " claude-opus-4-20250514 ");
      expect(limits).toEqual({ input: 200_000, output: 32_000 }); // Falls back to default
    });

    it("should handle special characters in model names", () => {
      const limits = getModelLimits("claude", "claude-opus-4-20250514!");
      expect(limits).toEqual({ input: 200_000, output: 32_000 }); // Falls back to default
    });

    it("should be consistent across multiple calls with same input", () => {
      const limits1 = getModelLimits("claude", "claude-opus-4-20250514");
      const limits2 = getModelLimits("claude", "claude-opus-4-20250514");
      expect(limits1).toEqual(limits2);
    });
  });

  describe("Cross-provider behavior", () => {
    it("should return different limits for the same model name under different providers", () => {
      // This tests that the function respects provider parameter
      const claudeDefault = getModelLimits("claude", "unknown-model");
      const codexDefault = getModelLimits("codex", "unknown-model");
      const geminiDefault = getModelLimits("gemini", "unknown-model");

      expect(claudeDefault).not.toEqual(codexDefault);
      expect(codexDefault).not.toEqual(geminiDefault);
      expect(claudeDefault).not.toEqual(geminiDefault);
    });

    it("should use model-specific limits even if called with different provider", () => {
      // Model-specific limits take precedence over provider defaults
      const limitsAsCodex = getModelLimits("codex", "claude-opus-4-20250514");
      const limitsAsClaude = getModelLimits("claude", "claude-opus-4-20250514");
      expect(limitsAsCodex).toEqual(limitsAsClaude);
      expect(limitsAsCodex).toEqual({ input: 200_000, output: 32_000 });
    });
  });

  describe("Model-specific comparison", () => {
    it("should reflect that Codex-Mini has lower input limit than other Codex models", () => {
      const mini = getModelLimits("codex", "gpt-5.1-codex-mini");
      const max = getModelLimits("codex", "gpt-5.1-codex-max");
      expect(mini.input).toBeLessThan(max.input);
    });

    it("should reflect that Claude Sonnet has higher output limit than Opus", () => {
      const opus = getModelLimits("claude", "claude-opus-4-20250514");
      const sonnet = getModelLimits("claude", "claude-sonnet-4-20250514");
      expect(sonnet.output).toBeGreaterThan(opus.output);
    });

    it("should reflect that Gemini models have much higher input limits than Claude", () => {
      const gemini = getModelLimits("gemini", "gemini-2.5-pro");
      const claude = getModelLimits("claude", "claude-opus-4-20250514");
      expect(gemini.input).toBeGreaterThan(claude.input);
    });

    it("should reflect that Haiku has lower output limit than Opus", () => {
      const haiku = getModelLimits("claude", "claude-3-5-haiku-20241022");
      const opus = getModelLimits("claude", "claude-opus-4-20250514");
      expect(haiku.output).toBeLessThan(opus.output);
    });
  });
});
