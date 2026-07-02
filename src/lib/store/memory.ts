import { judgeListings } from "../judge";
import { activeSources } from "../sources/active";
import { runWatch, type WatchSummary } from "../watch";
import type { AlertKind, Listing, WatchlistItem } from "../types";
import type { Deal, NewWatchItem, SnagStore, StoredAlert } from "./store";

// In-memory demo backend. Implements SnagStore so the app can run with zero
// configuration. State lives in the server process and resets on restart — used
// only as a fallback when Supabase env vars are not set.
export class MemoryStore implements SnagStore {
  private items: WatchlistItem[] = [];
  private alerts: StoredAlert[] = [];
  private listings = new Map<string, Listing & { id: string }>();
  private listingKeyToId = new Map<string, string>();
  private prices: { watchlistItemId: string; price: number }[] = [];
  private alertKeys = new Set<string>();
  private seq = 0;
  private seeded = false;

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

  async addItem(input: NewWatchItem): Promise<WatchlistItem> {
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

  async removeItem(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    this.alerts = this.alerts.filter((a) => a.watchlistItemId !== id);
  }

  async getItems(): Promise<WatchlistItem[]> {
    return this.items;
  }

  async runCheck(): Promise<WatchSummary> {
    return runWatch(this.items, activeSources(), this, {
      goodDealPct: 0.1,
      limitPerSource: 100,
      judge: judgeListings,
    });
  }

  async getDeals(): Promise<Deal[]> {
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
    await this.addItem({ title: "Nike Dunk Low Panda", category: "sneakers", query: "Nike Dunk Low Panda" });
    await this.addItem({ title: "Jordan 4 Retro Bred", category: "sneakers", query: "Jordan 4 Retro Bred" });
    await this.runCheck();
  }
}
