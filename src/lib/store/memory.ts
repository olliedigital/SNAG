import { MockSource } from "../sources/mock";
import { runWatch, type Store } from "../watch";
import type { AlertKind, Category, Listing, WatchlistItem } from "../types";

export interface StoredAlert {
  id: string;
  watchlistItemId: string;
  listingId: string;
  kind: AlertKind;
  dealScore?: number;
  referencePrice?: number;
  basis?: string;
  reason: string;
  createdAt: number;
}

export interface Deal {
  alert: StoredAlert;
  listing: Listing & { id: string };
  item: WatchlistItem;
}

// In-memory demo backend. Implements the pipeline's Store interface AND holds
// the watchlist + alerts for the UI to read. State lives in the server process
// and resets on restart — a stand-in until we wire Supabase.
class MemoryDB implements Store {
  items: WatchlistItem[] = [];
  alerts: StoredAlert[] = [];
  private listings = new Map<string, Listing & { id: string }>();
  private listingKeyToId = new Map<string, string>();
  private prices: { watchlistItemId: string; price: number }[] = [];
  private alertKeys = new Set<string>();
  private seq = 0;
  private seeded = false;

  // --- Store interface (called by the watch loop) ---
  async upsertListing(listing: Listing): Promise<{ id: string; isNew: boolean }> {
    const key = `${listing.watchlistItemId}:${listing.sourceKey}:${listing.sourceListingId}`;
    const existingId = this.listingKeyToId.get(key);
    if (existingId) {
      const prev = this.listings.get(existingId);
      this.listings.set(existingId, { ...prev, ...listing, id: existingId });
      return { id: existingId, isNew: false };
    }
    const id = `L${++this.seq}`;
    this.listingKeyToId.set(key, id);
    this.listings.set(id, { ...listing, id });
    return { id, isNew: true };
  }

  async recordPricePoint(p: { watchlistItemId: string; price: number }): Promise<void> {
    this.prices.push({ watchlistItemId: p.watchlistItemId, price: p.price });
  }

  async getRecentPrices(watchlistItemId: string): Promise<number[]> {
    return this.prices.filter((x) => x.watchlistItemId === watchlistItemId).map((x) => x.price);
  }

  async createAlertIfNew(a: {
    watchlistItemId: string;
    listingId: string;
    kind: AlertKind;
    dealScore?: number;
    referencePrice?: number;
    basis?: string;
    reason: string;
  }): Promise<{ created: boolean }> {
    const key = `${a.watchlistItemId}:${a.listingId}:${a.kind}`;
    if (this.alertKeys.has(key)) return { created: false };
    this.alertKeys.add(key);
    this.alerts.unshift({ id: `A${++this.seq}`, createdAt: Date.now(), ...a });
    return { created: true };
  }

  // --- App API (called by server actions + the page) ---
  addItem(input: { title: string; category: Category; query: string; maxPrice?: number }): WatchlistItem {
    const item: WatchlistItem = {
      id: `wi-${++this.seq}`,
      category: input.category,
      title: input.title,
      query: input.query,
      attributes: {},
      maxPrice: input.maxPrice,
      conditionPref: "any",
      active: true,
    };
    this.items.push(item);
    return item;
  }

  removeItem(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
    this.alerts = this.alerts.filter((a) => a.watchlistItemId !== id);
  }

  async runCheck(): Promise<void> {
    // Two pretend "stores" at different price levels so cross-site comparison
    // has something to compare. These get swapped for real adapters (eBay, …).
    const sources = [
      new MockSource("ebay_demo", "eBay (demo)", 1),
      new MockSource("bestbuy_demo", "Best Buy (demo)", 0.82),
    ];
    await runWatch(this.items, sources, this, { goodDealPct: 0.1 });
  }

  getDeals(): Deal[] {
    const deals: Deal[] = [];
    for (const alert of this.alerts) {
      const listing = this.listings.get(alert.listingId);
      const item = this.items.find((i) => i.id === alert.watchlistItemId);
      if (listing && item) deals.push({ alert, listing, item });
    }
    return deals.sort((a, b) => (b.alert.dealScore ?? 0) - (a.alert.dealScore ?? 0));
  }

  async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    this.seeded = true;
    this.addItem({ title: "Elden Ring (PS5)", category: "games", query: "Elden Ring PS5", maxPrice: 40 });
    this.addItem({ title: "Jordan 4 Retro Bred", category: "sneakers", query: "Jordan 4 Retro Bred" });
    await this.runCheck();
  }
}

// Module singleton — shared across requests in the same server process.
export const db = new MemoryDB();
