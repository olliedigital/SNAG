// End-to-end smoke test of the watch -> find -> show pipeline, using two
// MockSources (at different price levels) and an in-memory store — no network,
// no DB. Run: `npm run pipeline:smoke`
import { MockSource } from "../src/lib/sources/mock";
import { runWatch, type Store } from "../src/lib/watch";
import type { AlertKind, Listing, WatchlistItem } from "../src/lib/types";

class InMemoryStore implements Store {
  listings = new Map<string, Listing & { id: string }>();
  prices: { watchlistItemId: string; price: number }[] = [];
  alerts = new Map<string, { kind: AlertKind; reason: string; dealScore?: number }>();
  private seq = 0;

  async upsertListing(listing: Listing) {
    const key = `${listing.watchlistItemId}:${listing.sourceKey}:${listing.sourceListingId}`;
    const existing = this.listings.get(key);
    if (existing) {
      existing.price = listing.price;
      return { id: existing.id, isNew: false };
    }
    const id = `L${++this.seq}`;
    this.listings.set(key, { ...listing, id });
    return { id, isNew: true };
  }
  async recordPricePoint(p: { watchlistItemId: string; price: number }) {
    this.prices.push({ watchlistItemId: p.watchlistItemId, price: p.price });
  }
  async getRecentPrices(watchlistItemId: string) {
    return this.prices.filter((x) => x.watchlistItemId === watchlistItemId).map((x) => x.price);
  }
  async createAlertIfNew(a: {
    watchlistItemId: string;
    listingId: string;
    kind: AlertKind;
    reason: string;
    dealScore?: number;
  }) {
    const key = `${a.watchlistItemId}:${a.listingId}:${a.kind}`;
    if (this.alerts.has(key)) return { created: false };
    this.alerts.set(key, { kind: a.kind, reason: a.reason, dealScore: a.dealScore });
    return { created: true };
  }
}

const items: WatchlistItem[] = [
  {
    id: "wi-1",
    category: "games",
    title: "Elden Ring (PS5)",
    query: "Elden Ring PS5",
    attributes: { platform: "PS5" },
    conditionPref: "any",
    active: true,
  },
  {
    id: "wi-2",
    category: "sneakers",
    title: "Jordan 4 Retro Bred",
    query: "Jordan 4 Retro Bred",
    attributes: { mustExclude: ["replica", "proxy"] },
    conditionPref: "any",
    active: true,
  },
];

async function main() {
  const store = new InMemoryStore();
  // Two "sites": a baseline and a cheaper one -> exercises cross-site comparison.
  const sources = [
    new MockSource("mock_a", "Mock A", 1),
    new MockSource("mock_b", "Mock B (cheaper)", 0.7),
  ];

  const summary = await runWatch(items, sources, store, { goodDealPct: 0.1 });

  console.log("\n=== WATCH SUMMARY ===");
  console.log(summary);
  console.log("\n=== ALERTS (the cards SNAG would show) ===");
  if (store.alerts.size === 0) {
    console.log("(no alerts this run)");
  } else {
    for (const [key, a] of store.alerts) {
      const score = a.dealScore !== undefined ? `  [score ${a.dealScore}]` : "";
      console.log(`• ${key}${score}\n    ${a.reason}`);
    }
  }

  if (summary.alertsCreated === 0) {
    console.error("\nSMOKE FAILED: expected at least one alert");
    process.exit(1);
  }
  console.log(`\nSMOKE OK — ${summary.alertsCreated} alert(s) from ${summary.itemsChecked} item(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
