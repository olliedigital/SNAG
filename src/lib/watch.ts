import { assessDeal, type DealContext } from "./deal";
import { matchListing } from "./match";
import type { ListingSource } from "./sources/source";
import type { AlertKind, Listing, WatchlistItem } from "./types";

// Persistence boundary. A Supabase-backed impl lives in the app; tests use an
// in-memory impl. The core loop below depends only on this interface.
export interface Store {
  upsertListing(listing: Listing): Promise<{ id: string; isNew: boolean }>;
  recordPricePoint(p: {
    watchlistItemId: string;
    sourceKey: string;
    listingId: string;
    price: number;
    currency: string;
  }): Promise<void>;
  getRecentPrices(watchlistItemId: string, windowDays: number): Promise<number[]>;
  createAlertIfNew(a: {
    watchlistItemId: string;
    listingId: string;
    kind: AlertKind;
    dealScore?: number;
    referencePrice?: number;
    basis?: string;
    reason: string;
  }): Promise<{ created: boolean }>;
}

export interface WatchOptions {
  windowDays?: number;
  goodDealPct?: number;
  limitPerSource?: number;
}

export interface WatchSummary {
  itemsChecked: number;
  listingsSeen: number;
  newListings: number;
  matches: number;
  alertsCreated: number;
  errors: { item: string; source: string; message: string }[];
}

interface KeptListing {
  listingId: string;
  price: number;
  listing: Listing;
  isNew: boolean;
}

// One pass of the watch -> find -> show loop over the given items + sources.
export async function runWatch(
  items: WatchlistItem[],
  sources: ListingSource[],
  store: Store,
  opts: WatchOptions = {},
): Promise<WatchSummary> {
  const summary: WatchSummary = {
    itemsChecked: 0,
    listingsSeen: 0,
    newListings: 0,
    matches: 0,
    alertsCreated: 0,
    errors: [],
  };

  for (const item of items) {
    if (!item.active) continue;
    summary.itemsChecked++;

    // Collect matched listings per source FIRST, so cross-site comparison has
    // every site's prices before we judge any single listing.
    const perSource = new Map<string, KeptListing[]>();

    for (const source of sources) {
      try {
        const raws = await source.search({
          query: item.query,
          category: item.category,
          attributes: item.attributes,
          maxPrice: item.maxPrice,
          limit: opts.limitPerSource ?? 25,
        });
        summary.listingsSeen += raws.length;

        const kept: KeptListing[] = [];
        for (const raw of raws) {
          if (!Number.isFinite(raw.price) || raw.price <= 0) continue;
          if (!matchListing(item, raw).isMatch) continue;
          summary.matches++;

          const listing: Listing = { ...raw, watchlistItemId: item.id, sourceKey: source.key };
          const { id, isNew } = await store.upsertListing(listing);
          if (isNew) summary.newListings++;
          await store.recordPricePoint({
            watchlistItemId: item.id,
            sourceKey: source.key,
            listingId: id,
            price: raw.price,
            currency: raw.currency,
          });
          kept.push({ listingId: id, price: raw.price, listing: { ...listing, id }, isNew });
        }
        perSource.set(source.key, kept);
      } catch (err) {
        summary.errors.push({
          item: item.title,
          source: source.key,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Lowest price per source, for cross-site comparison.
    const lowestBySource: Record<string, number> = {};
    for (const [key, kept] of perSource) {
      const prices = kept.map((k) => k.price);
      if (prices.length > 0) lowestBySource[key] = Math.min(...prices);
    }
    const recentPrices = await store.getRecentPrices(item.id, opts.windowDays ?? 14);

    // Median asking price across everything matched this run (below-market rule).
    const allPrices: number[] = [];
    for (const kept of perSource.values()) {
      for (const k of kept) allPrices.push(k.price);
    }
    const marketReference = allPrices.length >= 3 ? median(allPrices) : undefined;

    // Assess each kept listing and raise an alert for good deals.
    for (const [key, kept] of perSource) {
      const otherSiteLowest: Record<string, number> = {};
      for (const [k, v] of Object.entries(lowestBySource)) {
        if (k !== key) otherSiteLowest[k] = v;
      }
      const ctx: DealContext = { otherSiteLowest, recentPrices, marketReference, goodDealPct: opts.goodDealPct };

      for (const k of kept) {
        const a = assessDeal(item, k.listing, ctx);
        if (!a.isGoodDeal) continue;
        const kind: AlertKind = "good_deal";
        const { created } = await store.createAlertIfNew({
          watchlistItemId: item.id,
          listingId: k.listingId,
          kind,
          dealScore: a.dealScore,
          referencePrice: a.referencePrice,
          basis: a.basis,
          reason: a.reason,
        });
        if (created) summary.alertsCreated++;
      }
    }
  }

  return summary;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
