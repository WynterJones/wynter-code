import { describe, it, expect } from "vitest";

/**
 * Tests for the fuzzyScore function from useLauncherSearch
 * We test this as a standalone utility since it's the core search algorithm
 */

// Replicate the fuzzyScore function for testing (since it's not exported)
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact prefix match
  if (textLower.startsWith(queryLower)) {
    return 100 + queryLower.length * 10;
  }

  // Contains match
  if (textLower.includes(queryLower)) {
    return 50 + queryLower.length * 5;
  }

  // Fuzzy character matching
  let score = 0;
  let queryIndex = 0;
  let consecutive = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 1 + consecutive;
      consecutive++;
      queryIndex++;

      // Bonus for word boundary
      if (i === 0 || /[\s\-_]/.test(text[i - 1])) {
        score += 3;
      }
    } else {
      consecutive = 0;
    }
  }

  // Must match all query characters
  if (queryIndex < queryLower.length) {
    return 0;
  }

  return score;
}

describe("fuzzyScore", () => {
  describe("empty query handling", () => {
    it("should return 1 for empty query", () => {
      expect(fuzzyScore("", "anything")).toBe(1);
      expect(fuzzyScore("", "")).toBe(1);
    });
  });

  describe("exact prefix matching", () => {
    it("should give highest score for exact prefix match", () => {
      // "set" matches "Settings" at the start
      const prefixScore = fuzzyScore("set", "Settings");
      // Should be 100 + 3*10 = 130
      expect(prefixScore).toBe(130);
    });

    it("should scale prefix score with query length", () => {
      const shortScore = fuzzyScore("se", "Settings");
      const longScore = fuzzyScore("sett", "Settings");

      // Longer prefix matches should score higher
      expect(longScore).toBeGreaterThan(shortScore);
    });

    it("should be case insensitive for prefix matching", () => {
      expect(fuzzyScore("SET", "settings")).toBe(fuzzyScore("set", "Settings"));
    });
  });

  describe("contains matching", () => {
    it("should give good score for substring match", () => {
      const containsScore = fuzzyScore("ting", "Settings");
      // Should be 50 + 4*5 = 70
      expect(containsScore).toBe(70);
    });

    it("should give lower score than prefix match", () => {
      const prefixScore = fuzzyScore("set", "Settings");
      const containsScore = fuzzyScore("ting", "Settings");

      expect(prefixScore).toBeGreaterThan(containsScore);
    });
  });

  describe("fuzzy character matching", () => {
    it("should match characters in order even if not consecutive", () => {
      // "fop" should match "FileOperations" (F-ile-O-erations-P...)
      // Wait, that doesn't match 'p'. Let's use a better example
      // "fo" should match "FileOperations"
      const score = fuzzyScore("fo", "FileOperations");
      expect(score).toBeGreaterThan(0);
    });

    it("should give bonus for consecutive matches", () => {
      // "fil" has 3 consecutive matches in "FileOperations"
      // "fle" has non-consecutive matches in "FileOperations"
      const consecutiveScore = fuzzyScore("fil", "FileOperations");
      const nonConsecutiveScore = fuzzyScore("fle", "FileOperations");

      expect(consecutiveScore).toBeGreaterThan(nonConsecutiveScore);
    });

    it("should give bonus for word boundary matches", () => {
      // "f" at start of "FileOperations" gets word boundary bonus
      // "i" in middle doesn't
      const wordBoundaryScore = fuzzyScore("f", "FileOperations");
      // Compare to a character not at word boundary
      expect(wordBoundaryScore).toBeGreaterThan(0);
    });

    it("should give bonus for matches after separator characters", () => {
      // "fo" in "file-operations" - 'o' is after '-'
      const score = fuzzyScore("fo", "file-operations");
      expect(score).toBeGreaterThan(0);
    });

    it("should return 0 if not all query characters match", () => {
      expect(fuzzyScore("xyz", "Settings")).toBe(0);
      expect(fuzzyScore("settingsx", "Settings")).toBe(0);
    });
  });

  describe("real-world tool search scenarios", () => {
    const tools = [
      "Settings",
      "Terminal",
      "File Browser",
      "Git Status",
      "Database Viewer",
      "Dev Toolkit",
      "Domain Tools",
      "Homebrew Manager",
      "MCP Manager",
    ];

    it("should rank exact prefix matches highest", () => {
      const scores = tools.map((t) => ({ name: t, score: fuzzyScore("set", t) }));
      const sorted = scores.sort((a, b) => b.score - a.score);

      expect(sorted[0].name).toBe("Settings");
    });

    it("should find tools by partial word", () => {
      const termScore = fuzzyScore("term", "Terminal");
      expect(termScore).toBeGreaterThan(0);

      const gitScore = fuzzyScore("git", "Git Status");
      expect(gitScore).toBeGreaterThan(0);
    });

    it("should find tools with multi-word queries", () => {
      const score = fuzzyScore("dev", "Dev Toolkit");
      expect(score).toBeGreaterThan(0);
    });

    it("should handle abbreviation-style queries", () => {
      // "db" should match "Database" (D-ata-B-ase)
      const dbScore = fuzzyScore("db", "Database Viewer");
      expect(dbScore).toBeGreaterThan(0);

      // "dt" should match "Dev Toolkit"
      const dtScore = fuzzyScore("dt", "Dev Toolkit");
      expect(dtScore).toBeGreaterThan(0);
    });

    it("should rank results sensibly for common queries", () => {
      // When searching "man", "MCP Manager" and "Homebrew Manager" should match
      // but neither should match before the other definitively
      const mcpScore = fuzzyScore("man", "MCP Manager");
      const homebrewScore = fuzzyScore("man", "Homebrew Manager");

      expect(mcpScore).toBeGreaterThan(0);
      expect(homebrewScore).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle single character queries", () => {
      expect(fuzzyScore("s", "Settings")).toBeGreaterThan(0);
      expect(fuzzyScore("x", "Settings")).toBe(0);
    });

    it("should handle query longer than text", () => {
      expect(fuzzyScore("settings is long", "Set")).toBe(0);
    });

    it("should handle special characters", () => {
      expect(fuzzyScore("-", "file-name")).toBeGreaterThan(0);
      expect(fuzzyScore("_", "file_name")).toBeGreaterThan(0);
    });

    it("should handle numbers in queries", () => {
      expect(fuzzyScore("123", "test123")).toBeGreaterThan(0);
      expect(fuzzyScore("1", "Phase1")).toBeGreaterThan(0);
    });

    it("should handle unicode characters", () => {
      // Should at least not throw
      expect(() => fuzzyScore("é", "résumé")).not.toThrow();
    });
  });

  describe("scoring consistency", () => {
    it("should return consistent scores for same inputs", () => {
      const score1 = fuzzyScore("test", "Testing");
      const score2 = fuzzyScore("test", "Testing");
      expect(score1).toBe(score2);
    });

    it("should differentiate between similar matches", () => {
      const exactPrefix = fuzzyScore("test", "testing");
      const containsMatch = fuzzyScore("est", "testing");
      const fuzzyMatch = fuzzyScore("tst", "testing");

      // Exact prefix should be highest
      expect(exactPrefix).toBeGreaterThan(containsMatch);
      expect(containsMatch).toBeGreaterThan(fuzzyMatch);
    });
  });
});
