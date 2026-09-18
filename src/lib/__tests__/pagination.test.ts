import { describe, expect, it } from "vitest";
import { pageCountFor, parsePage, rangeFor } from "@/lib/pagination";

describe("parsePage", () => {
  it("defaults to 1 for missing/invalid input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });

  it("parses a valid positive integer string", () => {
    expect(parsePage("3")).toBe(3);
  });
});

describe("rangeFor", () => {
  it("computes a zero-based inclusive range for a page", () => {
    expect(rangeFor(1, 25)).toEqual({ from: 0, to: 24 });
    expect(rangeFor(2, 25)).toEqual({ from: 25, to: 49 });
    expect(rangeFor(3, 10)).toEqual({ from: 20, to: 29 });
  });
});

describe("pageCountFor", () => {
  it("rounds up and never returns less than 1", () => {
    expect(pageCountFor(0, 25)).toBe(1);
    expect(pageCountFor(25, 25)).toBe(1);
    expect(pageCountFor(26, 25)).toBe(2);
    expect(pageCountFor(100, 25)).toBe(4);
  });
});
