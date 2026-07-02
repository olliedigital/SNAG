import { describe, expect, it } from "vitest";
import { parsePrice } from "./shopping";

describe("parsePrice", () => {
  it("parses currency strings", () => {
    expect(parsePrice("$123.45")).toBe(123.45);
    expect(parsePrice("$1,234.56")).toBe(1234.56);
    expect(parsePrice("USD 99")).toBe(99);
  });
  it("passes numbers through and rejects junk", () => {
    expect(parsePrice(75.5)).toBe(75.5);
    expect(Number.isNaN(parsePrice("free shipping"))).toBe(true);
    expect(Number.isNaN(parsePrice(undefined))).toBe(true);
  });
});
