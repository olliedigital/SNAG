import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { SnagStore } from "./store";

let instance: SnagStore | null = null;

// Returns the active backend: Supabase when its env vars are present, otherwise
// the in-memory demo store. Cached so we reuse one client per server process.
export function getStore(): SnagStore {
  if (instance) return instance;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  instance = url && serviceKey ? new SupabaseStore(url, serviceKey) : new MemoryStore();
  return instance;
}

// True when we're backed by the real database (vs. the demo fallback).
export function isLiveBackend(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export type { Deal, StoredAlert, SnagStore, NewWatchItem, PriceStats, MarketOffer } from "./store";
