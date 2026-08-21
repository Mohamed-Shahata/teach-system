import { describe, it, expect } from "vitest";
import { nextActiveIndex } from "./table-actions-menu";

describe("nextActiveIndex", () => {
  it("returns null when there are no enabled actions", () => {
    expect(nextActiveIndex([], -1, "next")).toBeNull();
  });

  it("moves to the first enabled index on 'first'", () => {
    expect(nextActiveIndex([1, 2, 4], -1, "first")).toBe(1);
  });

  it("moves to the last enabled index on 'last'", () => {
    expect(nextActiveIndex([1, 2, 4], -1, "last")).toBe(4);
  });

  it("advances to the next enabled index, skipping disabled gaps", () => {
    // action 3 is disabled (not in enabledIndices), so 2 -> 4
    expect(nextActiveIndex([0, 1, 2, 4], 2, "next")).toBe(4);
  });

  it("wraps from the last enabled index to the first on 'next'", () => {
    expect(nextActiveIndex([0, 1, 4], 4, "next")).toBe(0);
  });

  it("moves to the previous enabled index", () => {
    expect(nextActiveIndex([0, 1, 4], 4, "prev")).toBe(1);
  });

  it("wraps from the first enabled index to the last on 'prev'", () => {
    expect(nextActiveIndex([0, 1, 4], 0, "prev")).toBe(4);
  });

  it("starts from the beginning when nothing is active yet and 'next' is pressed", () => {
    expect(nextActiveIndex([2, 3], -1, "next")).toBe(2);
  });

  it("starts from the end when nothing is active yet and 'prev' is pressed", () => {
    expect(nextActiveIndex([2, 3], -1, "prev")).toBe(3);
  });
});
