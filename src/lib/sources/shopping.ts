import type { RawListing, SearchParams } from "../types";
import { ebaySearchQuery } from "../match";
import { type ListingSource, SourceNotConfiguredError } from "./source";

// Web deal scout: queries the Google Shopping index via Serper.dev, pulling the
// prices merchants publish to be found (StockX, GOAT, Amazon, Foot Locker, ...)
// and linking out to whichever store has the shoe. This is the ToS-clean way to
// see across the retail web — we consume a search API; nobody gets scraped by us.
const SERPER_URL = "https://google.serper.dev/shopping";

export class ShoppingScoutSource implements ListingSource {
  readonly key = "shopping";
  readonly name = "Web Scout (Google Shopping)";

  constructor(private readonly apiKey: string | undefined = process.env.SERPER_API_KEY) {}

  async search(params: SearchParams): Promise<RawListing[]> {
    const apiKey = this.apiKey?.trim();
    if (!apiKey) throw new SourceNotConfiguredError(this.key, "set SERPER_API_KEY");

    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: ebaySearchQuery(params.query), // same size-phrase cleanup as eBay
        gl: "us",
        hl: "en",
        num: Math.min(params.limit ?? 40, 100),
      }),
    });
    if (!res.ok) throw new Error(`Serper shopping search failed: ${res.status}`);
    const json = (await res.json()) as SerperShoppingResponse;

    return (json.shopping ?? [])
      .map((r) => {
        const price = parsePrice(r.price);
        return {
          sourceListingId: r.productId ?? r.link,
          title: r.source ? `${r.title} — ${r.source}` : r.title,
          url: r.link,
          price,
          currency: "USD",
          imageUrl: r.imageUrl,
          seller: r.source, // merchant/store name (business, not personal data)
          raw: undefined,
        } satisfies RawListing;
      })
      .filter((l) => Number.isFinite(l.price) && l.price > 0 && Boolean(l.url));
  }
}

interface SerperShoppingResponse {
  shopping?: {
    title: string;
    source?: string; // merchant name, e.g. "StockX", "Amazon.com", "GOAT"
    link: string;
    price?: string | number; // e.g. "$123.45"
    imageUrl?: string;
    productId?: string;
  }[];
}

export function parsePrice(p: unknown): number {
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const m = p.replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return Number.NaN;
}
