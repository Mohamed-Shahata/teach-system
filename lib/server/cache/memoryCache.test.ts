import { describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "./memoryCache";

describe("createMemoryCache", () => {
  it("returns null before anything is set", () => {
    const cache = createMemoryCache<string>(1000);
    expect(cache.get()).toBeNull();
  });

  it("returns the set value before the TTL expires", () => {
    const cache = createMemoryCache<string>(1000);
    cache.set("value");
    expect(cache.get()).toBe("value");
  });

  it("returns null once the TTL has elapsed", () => {
    vi.useFakeTimers();
    const cache = createMemoryCache<string>(1000);
    cache.set("value");
    vi.advanceTimersByTime(1001);
    expect(cache.get()).toBeNull();
    vi.useRealTimers();
  });

  it("returns null immediately after invalidate()", () => {
    const cache = createMemoryCache<string>(1000);
    cache.set("value");
    cache.invalidate();
    expect(cache.get()).toBeNull();
  });
});
