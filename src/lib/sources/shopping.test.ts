import { describe, expect, it } from "vitest";
import { parsePrice, storeSearchUrl } from "./shopping";

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

describe("storeSearchUrl", () => {
  it("links known stores to their own search", () => {
    expect(storeSearchUrl("StockX", "NB 9060 Grey", "g")).toBe("https://stockx.com/search?s=NB%209060%20Grey");
    expect(storeSearchUrl("GOAT", "NB 9060", "g")).toContain("goat.com/search");
    expect(storeSearchUrl("eBay - unitedkicks", "NB 9060", "g")).toContain("ebay.com/sch");
  });
  it("falls back to the original link for unknown stores", () => {
    expect(storeSearchUrl("Some Random Shop", "NB 9060", "https://fallback")).toBe("https://fallback");
    expect(storeSearchUrl(undefined, "NB 9060", "https://fallback")).toBe("https://fallback");
  });
});
