import { EbaySource } from "./ebay";
import { MockSource } from "./mock";
import { ShoppingScoutSource } from "./shopping";
import type { ListingSource } from "./source";

// The real sources SNAG queries each run:
// - eBay (official Browse API) when its credentials are set
// - the web scout (Google Shopping index via Serper) when its key is set
// With neither configured, two mock "stores" keep local/demo mode working.
export function activeSources(): ListingSource[] {
  const sources: ListingSource[] = [];
  if (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) {
    sources.push(new EbaySource());
  }
  if (process.env.SERPER_API_KEY) {
    sources.push(new ShoppingScoutSource());
  }
  if (sources.length === 0) {
    return [new MockSource("demo_a", "Demo Store A", 1), new MockSource("demo_b", "Demo Store B", 0.82)];
  }
  return sources;
}

export function usingEbay(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

export function usingScout(): boolean {
  return Boolean(process.env.SERPER_API_KEY);
}
