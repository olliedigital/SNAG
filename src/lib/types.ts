// Core domain types for the SNAG watch -> find -> show pipeline.

export type Category = "sneakers" | "games";
export type ConditionPref = "any" | "new" | "used";
export type AlertKind = "new_match" | "good_deal" | "price_drop";
export type DealBasis = "cross_site" | "history" | "max_price";

export interface WatchlistItem {
  id: string;
  category: Category;
  title: string; // plain-terms label, e.g. "Jordan 4 Retro Bred, size 10"
  query: string; // normalized search string sent to sources
  attributes: ItemAttributes;
  maxPrice?: number; // optional ceiling: only a "deal" at/below this
  conditionPref: ConditionPref;
  active: boolean;
}

// Loose, category-aware structured filters. All optional; used to refine matches.
export interface ItemAttributes {
  brand?: string;
  model?: string;
  size?: string; // sneakers (US size, may include "W")
  colorway?: string; // sneakers
  platform?: string; // games: 'PS5','Switch','Xbox', ...
  edition?: string; // games: 'Standard','Collector', ...
  mustInclude?: string[]; // tokens that MUST appear in a listing title
  mustExclude?: string[]; // tokens that must NOT appear (e.g. 'replica','case only')
  [key: string]: unknown; // free-form extras (e.g. eBay conditionIds)
}

// What a source adapter returns, before we attach it to a watchlist item.
export interface RawListing {
  sourceListingId: string;
  title: string;
  url: string;
  price: number;
  currency: string;
  condition?: string;
  imageUrl?: string;
  seller?: string;
  location?: string;
  raw?: unknown; // original payload, kept for debugging
}

// A normalized listing tied to the watchlist item that surfaced it.
export interface Listing extends RawListing {
  id?: string;
  watchlistItemId: string;
  sourceKey: string;
}

export interface DealAssessment {
  isMatch: boolean;
  isGoodDeal: boolean;
  dealScore?: number; // fraction below reference, e.g. 0.23 == 23% under
  referencePrice?: number;
  basis?: DealBasis;
  reason: string; // human-readable, shown on the card
}

export interface SearchParams {
  query: string;
  category: Category;
  attributes?: ItemAttributes;
  maxPrice?: number;
  limit?: number;
}
