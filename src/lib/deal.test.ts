import { describe, expect, it } from "vitest";
import { assessDeal } from "./deal";
import type { RawListing, WatchlistItem } from "./types";

const item: WatchlistItem = {
  id: "i1",
  category: "sneakers",
  title: "Test Item",
  query: "test item",
  attributes: {},
  conditionPref: "any",
  active: true,
};

function listing(price: number): RawListing {
  return { sourceListingId: "x", title: "Test Item", url: "u", price, currency: "USD" };
}

describe("assessDeal", () => {
  it("flags a cross-site deal when meaningfully cheaper than other sites", () => {
    const a = assessDeal(item, listing(80), { otherSiteLowest: { other: 100 }, goodDealPct: 0.1 });
    expect(a.isGoodDeal).toBe(true);
    expect(a.basis).toBe("cross_site");
    expect(a.dealScore).toBeCloseTo(0.2, 5);
  });

  it("does not flag when only marginally cheaper than other sites", () => {
    const a = assessDeal(item, listing(98), { otherSiteLowest: { other: 100 }, goodDealPct: 0.1 });
    expect(a.isGoodDeal).toBe(false);
  });

  it("flags a below-market deal from a single source", () => {
    const a = assessDeal(item, listing(70), { marketReference: 100, goodDealPct: 0.1 });
    expect(a.isGoodDeal).toBe(true);
    expect(a.basis).toBe("market");
  });

  it("uses the history rule (new low) when no other sites are present", () => {
    const a = assessDeal(item, listing(50), { recentPrices: [70, 65, 60] });
    expect(a.isGoodDeal).toBe(true);
    expect(a.basis).toBe("history");
  });

  it("ignores history until enough data points exist", () => {
    const a = assessDeal(item, listing(50), { recentPrices: [70] });
    expect(a.isGoodDeal).toBe(false);
  });

  it("flags when at/below the user's max price", () => {
    const a = assessDeal({ ...item, maxPrice: 60 }, listing(55));
    expect(a.isGoodDeal).toBe(true);
    expect(a.basis).toBe("max_price");
  });
});
