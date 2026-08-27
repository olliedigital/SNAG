import { judgeListings } from "../judge";
import { activeSources } from "../sources/active";
import { runWatch, type WatchSummary } from "../watch";
import type { AlertKind, Listing, WatchlistItem } from "../types";
import {
  computePriceStats,
  type Deal,
  type MarketOffer,
  type NewWatchItem,
  type PricePoint,
  type PriceStats,
  type SnagStore,
  type StoredAlert,
} from "./store";

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
      attributes: input.attributes ?? {},
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

  async setMaxPrice(id: string, maxPrice: number | null): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (item) item.maxPrice = maxPrice ?? undefined;
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

  async getPendingAlerts() {
    return []; // demo mode doesn't email
  }

  async getItemPriceStats(): Promise<Record<string, PriceStats>> {
    const byItem: Record<string, number[]> = {};
    for (const l of this.listings.values()) {
      (byItem[l.watchlistItemId] ??= []).push(l.price);
    }
    return computePriceStats(byItem);
  }

  async getMarketSnapshot(): Promise<Record<string, MarketOffer[]>> {
    const best: Record<string, Map<string, MarketOffer>> = {};
    for (const l of this.listings.values()) {
      const store = l.seller ?? (l.sourceKey === "ebay" ? "eBay" : l.sourceKey);
      const byStore = (best[l.watchlistItemId] ??= new Map());
      const prev = byStore.get(store);
      if (!prev || l.price < prev.price) byStore.set(store, { store, price: l.price, url: l.url });
    }
    const out: Record<string, MarketOffer[]> = {};
    for (const [itemId, byStore] of Object.entries(best)) {
      out[itemId] = [...byStore.values()].sort((a, b) => a.price - b.price).slice(0, 8);
    }
    return out;
  }

  async getPriceTrends(): Promise<Record<string, PricePoint[]>> {
    // Demo backend has no timestamped history, so synthesize a plausible 14-day
    // trend from the current spread (deterministic). Production reads real data.
    const byItem: Record<string, number[]> = {};
    for (const l of this.listings.values()) (byItem[l.watchlistItemId] ??= []).push(l.price);
    const now = Date.now();
    const out: Record<string, PricePoint[]> = {};
    for (const [itemId, prices] of Object.entries(byItem)) {
      const s = prices.filter((n) => n > 0).sort((a, b) => a - b);
      if (s.length < 2) continue;
      const min = s[0];
      const max = s[s.length - 1];
      const pts: PricePoint[] = [];
      for (let d = 13; d >= 0; d--) {
        const frac = d / 13; // 1 = 2 weeks ago, 0 = today
        const base = min + (max - min) * (0.3 + 0.5 * frac);
        const noise = Math.sin(d * 1.7 + itemId.length) * 0.05 * (max - min);
        pts.push({ t: now - d * 86_400_000, price: Math.max(min, Math.round(base + noise)) });
      }
      out[itemId] = pts;
    }
    return out;
  }

  async markAlertsSent(): Promise<void> {}

  private deviceTokens = new Set<string>();
  async saveDeviceToken(token: string): Promise<void> {
    if (token) this.deviceTokens.add(token);
  }
  async getDeviceTokens(): Promise<string[]> {
    return [...this.deviceTokens];
  }
  async removeDeviceToken(token: string): Promise<void> {
    this.deviceTokens.delete(token);
  }

  async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    this.seeded = true;
    await this.addItem({ title: "Nike Dunk Low Panda", category: "sneakers", query: "Nike Dunk Low Panda" });
    await this.addItem({ title: "Jordan 4 Retro Bred", category: "sneakers", query: "Jordan 4 Retro Bred" });
    await this.runCheck();
  }
}
