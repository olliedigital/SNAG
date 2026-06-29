import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { activeSources } from "../sources/active";
import { runWatch, type WatchSummary } from "../watch";
import type { AlertKind, Category, Listing, WatchlistItem } from "../types";
import type { Deal, NewWatchItem, SnagStore, StoredAlert } from "./store";

// Supabase-backed store. Server-side only: it uses the service role key, which
// bypasses RLS, so the database stays fully locked to the public.
export class SupabaseStore implements SnagStore {
  private readonly sb: SupabaseClient;
  private readonly sourceIds = new Map<string, string>();

  constructor(url: string, serviceKey: string) {
    this.sb = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Resolve a source row id by key, creating it on first use.
  private async sourceId(key: string): Promise<string> {
    const cached = this.sourceIds.get(key);
    if (cached) return cached;
    await this.sb.from("sources").upsert({ key, name: key }, { onConflict: "key", ignoreDuplicates: true });
    const { data, error } = await this.sb.from("sources").select("id").eq("key", key).single();
    if (error || !data) throw new Error(`source lookup failed (${key}): ${error?.message ?? "no row"}`);
    this.sourceIds.set(key, data.id as string);
    return data.id as string;
  }

  async upsertListing(listing: Listing): Promise<{ id: string; isNew: boolean }> {
    const source_id = await this.sourceId(listing.sourceKey);
    const { data: existing } = await this.sb
      .from("listings")
      .select("id")
      .eq("watchlist_item_id", listing.watchlistItemId)
      .eq("source_id", source_id)
      .eq("source_listing_id", listing.sourceListingId)
      .maybeSingle();

    const fields = {
      title: listing.title,
      url: listing.url,
      price: listing.price,
      currency: listing.currency,
      condition: listing.condition ?? null,
      image_url: listing.imageUrl ?? null,
      seller: listing.seller ?? null,
      location: listing.location ?? null,
    };

    if (existing) {
      await this.sb
        .from("listings")
        .update({ ...fields, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return { id: existing.id as string, isNew: false };
    }

    const { data, error } = await this.sb
      .from("listings")
      .insert({
        watchlist_item_id: listing.watchlistItemId,
        source_id,
        source_listing_id: listing.sourceListingId,
        raw: (listing.raw ?? {}) as Record<string, unknown>,
        ...fields,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`listing insert failed: ${error?.message ?? "no row"}`);
    return { id: data.id as string, isNew: true };
  }

  async recordPricePoint(p: {
    watchlistItemId: string;
    sourceKey: string;
    listingId: string;
    price: number;
    currency: string;
  }): Promise<void> {
    const source_id = await this.sourceId(p.sourceKey);
    await this.sb.from("price_points").insert({
      watchlist_item_id: p.watchlistItemId,
      source_id,
      listing_id: p.listingId,
      price: p.price,
      currency: p.currency,
    });
  }

  async getRecentPrices(watchlistItemId: string, windowDays: number): Promise<number[]> {
    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
    const { data } = await this.sb
      .from("price_points")
      .select("price")
      .eq("watchlist_item_id", watchlistItemId)
      .gte("captured_at", since);
    return (data ?? [])
      .map((r) => Number((r as { price: number | string }).price))
      .filter((n) => Number.isFinite(n));
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
    const { data, error } = await this.sb
      .from("alerts")
      .upsert(
        {
          watchlist_item_id: a.watchlistItemId,
          listing_id: a.listingId,
          kind: a.kind,
          deal_score: a.dealScore ?? null,
          reference_price: a.referencePrice ?? null,
          basis: a.basis ?? null,
          reason: a.reason,
        },
        { onConflict: "watchlist_item_id,listing_id,kind", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error(`alert upsert failed: ${error.message}`);
    return { created: (data?.length ?? 0) > 0 };
  }

  async addItem(input: NewWatchItem): Promise<WatchlistItem> {
    const { data, error } = await this.sb
      .from("watchlist_items")
      .insert({ category: input.category, title: input.title, query: input.query, max_price: input.maxPrice ?? null })
      .select("*")
      .single();
    if (error || !data) throw new Error(`add item failed: ${error?.message ?? "no row"}`);
    return mapItem(data as ItemRow);
  }

  async removeItem(id: string): Promise<void> {
    await this.sb.from("watchlist_items").delete().eq("id", id);
  }

  async getItems(): Promise<WatchlistItem[]> {
    const { data } = await this.sb
      .from("watchlist_items")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });
    return ((data ?? []) as ItemRow[]).map(mapItem);
  }

  async runCheck(): Promise<WatchSummary> {
    const items = await this.getItems();
    return runWatch(items, activeSources(), this, { goodDealPct: 0.1 });
  }

  async getDeals(): Promise<Deal[]> {
    const { data } = await this.sb
      .from("alerts")
      .select("*, listing:listings(*, source:sources(key,name)), item:watchlist_items(*)")
      .order("deal_score", { ascending: false, nullsFirst: false });

    const deals: Deal[] = [];
    for (const row of (data ?? []) as AlertRow[]) {
      if (!row.listing || !row.item) continue;
      deals.push({ alert: mapAlert(row), listing: mapListing(row.listing), item: mapItem(row.item) });
    }
    return deals;
  }

  async ensureSeeded(): Promise<void> {
    const { count } = await this.sb.from("watchlist_items").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    await this.addItem({ title: "Elden Ring (PS5)", category: "games", query: "Elden Ring PS5", maxPrice: 40 });
    await this.addItem({ title: "Jordan 4 Retro Bred", category: "sneakers", query: "Jordan 4 Retro Bred" });
    await this.runCheck();
  }
}

// --- DB row shapes + mappers (snake_case -> domain camelCase) ---
interface ItemRow {
  id: string;
  category: string;
  title: string;
  query: string;
  attributes?: Record<string, unknown> | null;
  max_price?: number | string | null;
  condition_pref?: string | null;
  active?: boolean | null;
}
interface ListingRow {
  id: string;
  watchlist_item_id: string;
  source_listing_id: string;
  title: string;
  url: string;
  price: number | string;
  currency: string;
  condition?: string | null;
  image_url?: string | null;
  seller?: string | null;
  location?: string | null;
  source?: { key?: string | null; name?: string | null } | null;
}
interface AlertRow {
  id: string;
  watchlist_item_id: string;
  listing_id: string;
  kind: AlertKind;
  deal_score?: number | string | null;
  reference_price?: number | string | null;
  basis?: string | null;
  reason: string;
  created_at?: string | null;
  listing?: ListingRow | null;
  item?: ItemRow | null;
}

function mapItem(r: ItemRow): WatchlistItem {
  return {
    id: r.id,
    category: (r.category as Category) ?? "games",
    title: r.title,
    query: r.query,
    attributes: (r.attributes ?? {}) as WatchlistItem["attributes"],
    maxPrice: r.max_price != null ? Number(r.max_price) : undefined,
    conditionPref: (r.condition_pref as WatchlistItem["conditionPref"]) ?? "any",
    active: r.active ?? true,
  };
}
function mapListing(r: ListingRow): Listing & { id: string } {
  return {
    id: r.id,
    watchlistItemId: r.watchlist_item_id,
    sourceKey: r.source?.key ?? "",
    sourceListingId: r.source_listing_id,
    title: r.title,
    url: r.url,
    price: Number(r.price),
    currency: r.currency,
    condition: r.condition ?? undefined,
    imageUrl: r.image_url ?? undefined,
    seller: r.seller ?? undefined,
    location: r.location ?? undefined,
  };
}
function mapAlert(r: AlertRow): StoredAlert {
  return {
    id: r.id,
    watchlistItemId: r.watchlist_item_id,
    listingId: r.listing_id,
    kind: r.kind,
    dealScore: r.deal_score != null ? Number(r.deal_score) : undefined,
    referencePrice: r.reference_price != null ? Number(r.reference_price) : undefined,
    basis: r.basis ?? undefined,
    reason: r.reason,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}
