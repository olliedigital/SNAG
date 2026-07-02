import { describe, expect, it } from "vitest";
import { runWatch, type Store } from "./watch";
import type { ListingSource } from "./sources/source";
import type { RawListing, WatchlistItem } from "./types";

class StubStore implements Store {
  upserts = 0;
  async upsertListing() {
    return { id: `L${++this.upserts}`, isNew: true };
  }
  async recordPricePoint() {}
  async getRecentPrices() {
    return [];
  }
  async createAlertIfNew() {
    return { created: true };
  }
}

function raw(i: number, price: number): RawListing {
  return { sourceListingId: `id${i}`, title: `Test Shoe ${i}`, url: "u", price, currency: "USD" };
}

const item: WatchlistItem = {
  id: "i1",
  category: "sneakers",
  title: "Test Shoe",
  query: "Test Shoe",
  attributes: {},
  conditionPref: "any",
  active: true,
};

const source: ListingSource = {
  key: "stub",
  name: "Stub",
  search: async () => [raw(0, 100), raw(1, 110), raw(2, 120)],
};

describe("runWatch AI judge wiring", () => {
  it("drops listings the judge rejects and counts them", async () => {
    const store = new StubStore();
    const summary = await runWatch([item], [source], store, {
      judge: async () => new Set([0, 2]), // rejects index 1
    });
    expect(summary.matches).toBe(2);
    expect(summary.aiRejected).toBe(1);
    expect(store.upserts).toBe(2);
    expect(summary.judgeError).toBeUndefined();
  });

  it("fails open when the judge is unavailable", async () => {
    const store = new StubStore();
    const summary = await runWatch([item], [source], store, {
      judge: async () => null, // judge errored
    });
    expect(summary.matches).toBe(3);
    expect(summary.aiRejected).toBe(0);
    expect(store.upserts).toBe(3);
    expect(summary.judgeError).toContain("kept all strict-match results");
  });

  it("runs unchanged with no judge configured", async () => {
    const store = new StubStore();
    const summary = await runWatch([item], [source], store, {});
    expect(summary.matches).toBe(3);
    expect(summary.aiRejected).toBe(0);
  });
});
