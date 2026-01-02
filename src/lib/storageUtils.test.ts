import { describe, it, expect, beforeEach } from "vitest";
import {
  getTotalStorageSize,
  formatBytes,
  getCategoryData,
  getCategorySize,
  clearStorageKeys,
  DATA_CATEGORIES,
} from "./storageUtils";

describe("storageUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("formatBytes", () => {
    it("returns '0 B' for zero bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("formats bytes correctly", () => {
      expect(formatBytes(500)).toBe("500 B");
    });

    it("formats kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1572864)).toBe("1.5 MB");
    });

    it("formats gigabytes correctly", () => {
      expect(formatBytes(1073741824)).toBe("1 GB");
    });

    it("handles decimal precision", () => {
      expect(formatBytes(1126)).toBe("1.1 KB");
      expect(formatBytes(2048)).toBe("2 KB");
    });
  });

  describe("getTotalStorageSize", () => {
    it("returns 0 for empty localStorage", () => {
      expect(getTotalStorageSize()).toBe(0);
    });

    it("calculates size for single item", () => {
      localStorage.setItem("test", "hello");
      const size = getTotalStorageSize();
      expect(size).toBeGreaterThan(0);
    });

    it("calculates cumulative size for multiple items", () => {
      localStorage.setItem("key1", "value1");
      const size1 = getTotalStorageSize();

      localStorage.setItem("key2", "value2");
      const size2 = getTotalStorageSize();

      expect(size2).toBeGreaterThan(size1);
    });
  });

  describe("getCategoryData", () => {
    it("returns empty object for non-existent keys", () => {
      const data = getCategoryData(["nonexistent1", "nonexistent2"]);
      expect(data).toEqual({});
    });

    it("returns parsed JSON for valid JSON items", () => {
      const testData = { foo: "bar", count: 42 };
      localStorage.setItem("test-key", JSON.stringify(testData));

      const data = getCategoryData(["test-key"]);
      expect(data["test-key"]).toEqual(testData);
    });

    it("returns raw string for non-JSON items", () => {
      localStorage.setItem("plain-key", "not json");

      const data = getCategoryData(["plain-key"]);
      expect(data["plain-key"]).toBe("not json");
    });

    it("handles mixed JSON and non-JSON items", () => {
      localStorage.setItem("json-key", JSON.stringify({ a: 1 }));
      localStorage.setItem("string-key", "plain text");

      const data = getCategoryData(["json-key", "string-key"]);
      expect(data["json-key"]).toEqual({ a: 1 });
      expect(data["string-key"]).toBe("plain text");
    });

    it("skips keys that do not exist", () => {
      localStorage.setItem("exists", "value");

      const data = getCategoryData(["exists", "missing"]);
      expect(data).toHaveProperty("exists");
      expect(data).not.toHaveProperty("missing");
    });
  });

  describe("getCategorySize", () => {
    it("returns 0 for empty keys array", () => {
      expect(getCategorySize([])).toBe(0);
    });

    it("returns 0 for non-existent keys", () => {
      expect(getCategorySize(["missing1", "missing2"])).toBe(0);
    });

    it("calculates size for existing keys", () => {
      localStorage.setItem("test1", "hello");
      localStorage.setItem("test2", "world");

      const size = getCategorySize(["test1", "test2"]);
      expect(size).toBeGreaterThan(0);
    });

    it("calculates cumulative size correctly", () => {
      localStorage.setItem("a", "short");
      localStorage.setItem("b", "this is a much longer string");

      const sizeA = getCategorySize(["a"]);
      const sizeB = getCategorySize(["b"]);
      const sizeBoth = getCategorySize(["a", "b"]);

      expect(sizeBoth).toBe(sizeA + sizeB);
    });
  });

  describe("clearStorageKeys", () => {
    it("does nothing for empty keys array", () => {
      localStorage.setItem("keep", "value");
      clearStorageKeys([]);
      expect(localStorage.getItem("keep")).toBe("value");
    });

    it("removes specified keys", () => {
      localStorage.setItem("remove1", "value1");
      localStorage.setItem("remove2", "value2");
      localStorage.setItem("keep", "value3");

      clearStorageKeys(["remove1", "remove2"]);

      expect(localStorage.getItem("remove1")).toBeNull();
      expect(localStorage.getItem("remove2")).toBeNull();
      expect(localStorage.getItem("keep")).toBe("value3");
    });

    it("handles non-existent keys gracefully", () => {
      localStorage.setItem("existing", "value");

      expect(() => {
        clearStorageKeys(["nonexistent", "existing"]);
      }).not.toThrow();

      expect(localStorage.getItem("existing")).toBeNull();
    });
  });

  describe("DATA_CATEGORIES", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(DATA_CATEGORIES)).toBe(true);
      expect(DATA_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("each category has required properties", () => {
      for (const category of DATA_CATEGORIES) {
        expect(category).toHaveProperty("id");
        expect(category).toHaveProperty("name");
        expect(category).toHaveProperty("description");
        expect(category).toHaveProperty("keys");
        expect(category).toHaveProperty("canExport");
        expect(category).toHaveProperty("canClear");
        expect(typeof category.id).toBe("string");
        expect(typeof category.name).toBe("string");
        expect(typeof category.description).toBe("string");
        expect(Array.isArray(category.keys)).toBe(true);
        expect(typeof category.canExport).toBe("boolean");
        expect(typeof category.canClear).toBe("boolean");
      }
    });

    it("all category IDs are unique", () => {
      const ids = DATA_CATEGORIES.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("includes expected categories", () => {
      const categoryIds = DATA_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain("sessions");
      expect(categoryIds).toContain("workspaces");
      expect(categoryIds).toContain("tools");
      expect(categoryIds).toContain("settings");
    });

    it("settings category is protected", () => {
      const settingsCategory = DATA_CATEGORIES.find((c) => c.id === "settings");
      expect(settingsCategory).toBeDefined();
      expect(settingsCategory?.isProtected).toBe(true);
      expect(settingsCategory?.canClear).toBe(false);
    });
  });
});
