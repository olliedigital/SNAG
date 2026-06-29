import { EbaySource } from "./ebay";
import { MockSource } from "./mock";
import type { ListingSource } from "./source";

// The real sources SNAG queries. eBay (sneakers) when configured; otherwise two
// mock "stores" so the app still runs in local/demo mode without credentials.
export function activeSources(): ListingSource[] {
  if (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) {
    return [new EbaySource()];
  }
  return [
    new MockSource("demo_a", "Demo Store A", 1),
    new MockSource("demo_b", "Demo Store B", 0.82),
  ];
}

// True when the live eBay source is configured.
export function usingEbay(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}
