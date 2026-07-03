import type { PendingAlert } from "../notify";
import type { Store, WatchSummary } from "../watch";
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

export interface NewWatchItem {
  title: string;
  category: Category;
  query: string;
  maxPrice?: number;
}

// Everything the app (server actions + page) needs from a backend. Extends the
// pipeline's Store (write side) with watchlist + alert read/write. Both the
// in-memory demo store and the Supabase store implement this.
export interface SnagStore extends Store {
  addItem(input: NewWatchItem): Promise<WatchlistItem>;
  removeItem(id: string): Promise<void>;
  getItems(): Promise<WatchlistItem[]>;
  getDeals(): Promise<Deal[]>;
  runCheck(): Promise<WatchSummary>;
  ensureSeeded(): Promise<void>;
  // Email-alert queue: alerts not yet notified, and marking them sent.
  getPendingAlerts(): Promise<PendingAlert[]>;
  markAlertsSent(ids: string[]): Promise<void>;
  // Current price spread per watchlist item (drives the market-position bar).
  getItemPriceStats(): Promise<Record<string, PriceStats>>;
  // Lowest tracked price per store per item (drives the across-the-market strip).
  getMarketSnapshot(): Promise<Record<string, MarketOffer[]>>;
}

export interface MarketOffer {
  store: string;
  price: number;
  url: string;
}

export interface PriceStats {
  min: number;
  max: number;
  median: number;
  count: number;
}

export function computePriceStats(pricesByItem: Record<string, number[]>): Record<string, PriceStats> {
  const out: Record<string, PriceStats> = {};
  for (const [itemId, prices] of Object.entries(pricesByItem)) {
    const s = prices.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
    if (s.length === 0) continue;
    const mid = Math.floor(s.length / 2);
    out[itemId] = {
      min: s[0],
      max: s[s.length - 1],
      median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
      count: s.length,
    };
  }
  return out;
}
