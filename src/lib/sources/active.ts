import { CheapSharkSource } from "./cheapshark";
import { EbaySource } from "./ebay";
import type { ListingSource } from "./source";

// The real sources SNAG queries each run.
// - CheapShark (free, no key) is always on — real digital game deals.
// - eBay activates once EBAY_CLIENT_ID/SECRET are set — sneakers + physical items.
export function activeSources(): ListingSource[] {
  const sources: ListingSource[] = [new CheapSharkSource()];
  if (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) {
    sources.push(new EbaySource());
  }
  return sources;
}

// True when the eBay source is configured (sneakers + physical coverage).
export function usingEbay(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}
