import { describe, expect, it } from "vitest";
import { parseTheme } from "@/lib/theme";

describe("parseTheme", () => {
  it("accepts 'light'", () => {
    expect(parseTheme("light")).toBe("light");
  });

  it("accepts 'dark'", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it("returns null for undefined (no cookie set)", () => {
    expect(parseTheme(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseTheme(null)).toBeNull();
  });

  it("returns null for an invalid/tampered value", () => {
    expect(parseTheme("system")).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme("Dark")).toBeNull();
  });
});
