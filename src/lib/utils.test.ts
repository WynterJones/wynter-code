import { describe, it, expect } from "vitest";
import { cn, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe(
      "base visible"
    );
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("formatDate", () => {
  it("formats a date correctly", () => {
    const date = new Date("2024-03-15T14:30:00");
    const formatted = formatDate(date);
    // Format: "Mar 15, 02:30 PM" (locale-dependent)
    expect(formatted).toContain("Mar");
    expect(formatted).toContain("15");
  });

  it("handles midnight", () => {
    const date = new Date("2024-01-01T00:00:00");
    const formatted = formatDate(date);
    expect(formatted).toContain("Jan");
    expect(formatted).toContain("1");
  });

  it("handles different months", () => {
    const december = new Date("2024-12-25T12:00:00");
    const formatted = formatDate(december);
    expect(formatted).toContain("Dec");
    expect(formatted).toContain("25");
  });
});
