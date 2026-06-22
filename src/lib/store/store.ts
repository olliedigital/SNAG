import type { Store } from "../watch";
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
  runCheck(): Promise<void>;
  ensureSeeded(): Promise<void>;
}
