import { describe, it, expect } from "vitest";
import { getModelLimits } from "./modelLimits";

describe("getModelLimits", () => {
  describe("Claude models", () => {
    it("should return correct limits for claude-fable-5", () => {
      const limits = getModelLimits("claude", "claude-fable-5");
      expect(limits).toEqual({ input: 1_000_000, output: 128_000 });
    });

    it("should return correct limits for claude-opus-4-8", () => {
      const limits = getModelLimits("claude", "claude-opus-4-8");
      expect(limits).toEqual({ input: 1_000_000, output: 128_000 });
    });

    it("should return correct limits for claude-sonnet-4-6", () => {
      const limits = getModelLimits("claude", "claude-sonnet-4-6");
      expect(limits).toEqual({ input: 1_000_000, output: 64_000 });
    });

    it("should return correct limits for claude-haiku-4-5", () => {
      const limits = getModelLimits("claude", "claude-haiku-4-5");
      expect(limits).toEqual({ input: 200_000, output: 64_000 });
    });

    it("should return Claude provider default for unknown Claude model", () => {
      const limits = getModelLimits("claude", "claude-unknown-model");
      expect(limits).toEqual({ input: 200_000, output: 64_000 });
    });

    it("should return Claude provider default for empty model string", () => {
      const limits = getModelLimits("claude", "");
      expect(limits).toEqual({ input: 200_000, output: 64_000 });
    });
  });

  describe("Codex models", () => {
    it("should return correct limits for gpt-5.5", () => {
      const limits = getModelLimits("codex", "gpt-5.5");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return correct limits for gpt-5.4", () => {
      const limits = getModelLimits("codex", "gpt-5.4");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return correct limits for gpt-5.4-mini", () => {
      const limits = getModelLimits("codex", "gpt-5.4-mini");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return correct limits for gpt-5.3-codex-spark", () => {
      const limits = getModelLimits("codex", "gpt-5.3-codex-spark");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return Codex provider default for unknown Codex model", () => {
      const limits = getModelLimits("codex", "gpt-6-unknown");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });

    it("should return Codex provider default for empty model string", () => {
      const limits = getModelLimits("codex", "");
      expect(limits).toEqual({ input: 400_000, output: 128_000 });
    });
  });

  describe("Provider defaults", () => {
    it("should return Claude provider default when model not found", () => {
      const limits = getModelLimits("claude", "some-random-model");
      expect(limits.input).toBe(200_000);
      expect(limits.output).toBe(64_000);
    });

    it("should return Codex provider default when model not found", () => {
      const limits = getModelLimits("codex", "some-random-model");
      expect(limits.input).toBe(400_000);
      expect(limits.output).toBe(128_000);
    });
  });

  describe("Return value structure", () => {
    it("should always return an object with input and output properties", () => {
      const limits = getModelLimits("claude", "claude-fable-5");
      expect(limits).toHaveProperty("input");
      expect(limits).toHaveProperty("output");
    });

    it("should return numeric values for input and output", () => {
      const limits = getModelLimits("claude", "claude-fable-5");
      expect(typeof limits.input).toBe("number");
      expect(typeof limits.output).toBe("number");
    });

    it("should return positive numbers for all limits", () => {
      const limits = getModelLimits("codex", "gpt-5.5");
      expect(limits.input).toBeGreaterThan(0);
      expect(limits.output).toBeGreaterThan(0);
    });

    it("should return input limits greater than output limits", () => {
      const limits = getModelLimits("claude", "claude-fable-5");
      expect(limits.input).toBeGreaterThan(limits.output);
    });
  });

  describe("Edge cases", () => {
    it("should handle case-sensitive model names", () => {
      // Model names are case-sensitive, so wrong case should fall back to provider default
      const limits = getModelLimits("claude", "CLAUDE-FABLE-5");
      expect(limits).toEqual({ input: 200_000, output: 64_000 }); // Falls back to default
    });

    it("should handle whitespace in model names", () => {
      const limits = getModelLimits("claude", " claude-fable-5 ");
      expect(limits).toEqual({ input: 200_000, output: 64_000 }); // Falls back to default
    });

    it("should handle special characters in model names", () => {
      const limits = getModelLimits("claude", "claude-fable-5!");
      expect(limits).toEqual({ input: 200_000, output: 64_000 }); // Falls back to default
    });

    it("should be consistent across multiple calls with same input", () => {
      const limits1 = getModelLimits("claude", "claude-fable-5");
      const limits2 = getModelLimits("claude", "claude-fable-5");
      expect(limits1).toEqual(limits2);
    });
  });

  describe("Cross-provider behavior", () => {
    it("should return different limits for the same model name under different providers", () => {
      // This tests that the function respects provider parameter
      const claudeDefault = getModelLimits("claude", "unknown-model");
      const codexDefault = getModelLimits("codex", "unknown-model");

      expect(claudeDefault).not.toEqual(codexDefault);
    });

    it("should use model-specific limits even if called with different provider", () => {
      // Model-specific limits take precedence over provider defaults
      const limitsAsCodex = getModelLimits("codex", "claude-fable-5");
      const limitsAsClaude = getModelLimits("claude", "claude-fable-5");
      expect(limitsAsCodex).toEqual(limitsAsClaude);
      expect(limitsAsCodex).toEqual({ input: 1_000_000, output: 128_000 });
    });
  });

  describe("Model-specific comparison", () => {
    it("should reflect that Haiku has a smaller context window than Fable", () => {
      const haiku = getModelLimits("claude", "claude-haiku-4-5");
      const fable = getModelLimits("claude", "claude-fable-5");
      expect(haiku.input).toBeLessThan(fable.input);
    });

    it("should reflect that Sonnet has lower output limit than Opus", () => {
      const sonnet = getModelLimits("claude", "claude-sonnet-4-6");
      const opus = getModelLimits("claude", "claude-opus-4-8");
      expect(sonnet.output).toBeLessThan(opus.output);
    });

    it("should reflect that Haiku has lower output limit than Opus", () => {
      const haiku = getModelLimits("claude", "claude-haiku-4-5");
      const opus = getModelLimits("claude", "claude-opus-4-8");
      expect(haiku.output).toBeLessThan(opus.output);
    });
  });
});
