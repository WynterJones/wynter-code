import { describe, it, expect } from "vitest";
import {
  STORYBOOK_DEFAULT_PORT,
  LIVE_PREVIEW_DEFAULT_PORT,
  COPY_FEEDBACK_TIMEOUT,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TERMINAL_HEIGHT,
  SCROLLBAR_AUTO_HIDE_DELAY,
} from "./constants";

describe("constants", () => {
  describe("Server Ports", () => {
    it("STORYBOOK_DEFAULT_PORT is defined and valid", () => {
      expect(STORYBOOK_DEFAULT_PORT).toBe(6006);
      expect(STORYBOOK_DEFAULT_PORT).toBeGreaterThan(0);
      expect(STORYBOOK_DEFAULT_PORT).toBeLessThan(65536);
    });

    it("LIVE_PREVIEW_DEFAULT_PORT is defined and valid", () => {
      expect(LIVE_PREVIEW_DEFAULT_PORT).toBe(9876);
      expect(LIVE_PREVIEW_DEFAULT_PORT).toBeGreaterThan(0);
      expect(LIVE_PREVIEW_DEFAULT_PORT).toBeLessThan(65536);
    });

    it("ports are different from each other", () => {
      expect(STORYBOOK_DEFAULT_PORT).not.toBe(LIVE_PREVIEW_DEFAULT_PORT);
    });
  });

  describe("Timing", () => {
    it("COPY_FEEDBACK_TIMEOUT is defined and reasonable", () => {
      expect(COPY_FEEDBACK_TIMEOUT).toBe(2000);
      expect(COPY_FEEDBACK_TIMEOUT).toBeGreaterThan(0);
      expect(COPY_FEEDBACK_TIMEOUT).toBeLessThanOrEqual(5000);
    });
  });

  describe("UI Dimensions", () => {
    it("DEFAULT_SIDEBAR_WIDTH is defined and reasonable", () => {
      expect(DEFAULT_SIDEBAR_WIDTH).toBe(256);
      expect(DEFAULT_SIDEBAR_WIDTH).toBeGreaterThan(100);
      expect(DEFAULT_SIDEBAR_WIDTH).toBeLessThan(500);
    });

    it("DEFAULT_TERMINAL_HEIGHT is defined and reasonable", () => {
      expect(DEFAULT_TERMINAL_HEIGHT).toBe(200);
      expect(DEFAULT_TERMINAL_HEIGHT).toBeGreaterThan(50);
      expect(DEFAULT_TERMINAL_HEIGHT).toBeLessThan(500);
    });

    it("SCROLLBAR_AUTO_HIDE_DELAY is defined and reasonable", () => {
      expect(SCROLLBAR_AUTO_HIDE_DELAY).toBe(400);
      expect(SCROLLBAR_AUTO_HIDE_DELAY).toBeGreaterThan(0);
      expect(SCROLLBAR_AUTO_HIDE_DELAY).toBeLessThanOrEqual(2000);
    });
  });

  describe("Type safety", () => {
    it("all constants are numbers", () => {
      expect(typeof STORYBOOK_DEFAULT_PORT).toBe("number");
      expect(typeof LIVE_PREVIEW_DEFAULT_PORT).toBe("number");
      expect(typeof COPY_FEEDBACK_TIMEOUT).toBe("number");
      expect(typeof DEFAULT_SIDEBAR_WIDTH).toBe("number");
      expect(typeof DEFAULT_TERMINAL_HEIGHT).toBe("number");
      expect(typeof SCROLLBAR_AUTO_HIDE_DELAY).toBe("number");
    });

    it("all constants are integers", () => {
      expect(Number.isInteger(STORYBOOK_DEFAULT_PORT)).toBe(true);
      expect(Number.isInteger(LIVE_PREVIEW_DEFAULT_PORT)).toBe(true);
      expect(Number.isInteger(COPY_FEEDBACK_TIMEOUT)).toBe(true);
      expect(Number.isInteger(DEFAULT_SIDEBAR_WIDTH)).toBe(true);
      expect(Number.isInteger(DEFAULT_TERMINAL_HEIGHT)).toBe(true);
      expect(Number.isInteger(SCROLLBAR_AUTO_HIDE_DELAY)).toBe(true);
    });
  });
});
