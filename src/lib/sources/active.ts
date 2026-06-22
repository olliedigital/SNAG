import { EbaySource } from "./ebay";
import { MockSource } from "./mock";
import type { ListingSource } from "./source";

// The sources SNAG actually queries each run. Uses the real eBay adapter once
// its credentials are configured; otherwise falls back to two mock "stores" so
// the app still works in demo mode.
export function activeSources(): ListingSource[] {
  if (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) {
    return [new EbaySource()];
  }
  return [
    new MockSource("ebay_demo", "eBay (demo)", 1),
    new MockSource("bestbuy_demo", "Best Buy (demo)", 0.82),
  ];
}

// True when the real eBay source is active (credentials present).
export function usingLiveSources(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}
