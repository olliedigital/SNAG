import type { RawListing, SearchParams } from "../types";
import type { ListingSource } from "./source";

// Deterministic fake source so the full pipeline runs offline (dev + tests).
// Generates a spread of listings around a base price derived from the query, so
// matching and good-deal logic have realistic-looking data to chew on.
// `priceMultiplier` lets a test stand up two "sites" at different price levels
// to exercise cross-site comparison.
export class MockSource implements ListingSource {
  constructor(
    readonly key: string = "mock",
    readonly name: string = "Mock Source (dev)",
    private readonly priceMultiplier: number = 1,
  ) {}

  async search(params: SearchParams): Promise<RawListing[]> {
    const base = basePrice(params.query) * this.priceMultiplier;
    const conditions = ["new", "used", "used", "new", "new"];
    const offsets = [0.78, 0.95, 1.0, 1.12, 1.3]; // some deals, some overpriced
    return offsets.map((mult, i) => {
      const price = round2(base * mult);
      const cond = conditions[i % conditions.length];
      const id = `${this.key}-${slug(params.query)}-${i}`;
      return {
        sourceListingId: id,
        title: `${titleCase(params.query)} ${cond === "new" ? "(New, Sealed)" : "(Used, Good)"}`,
        url: `https://example.test/${this.key}/${id}`,
        price,
        currency: "USD",
        condition: cond,
        imageUrl: `https://example.test/img/${id}.jpg`,
        seller: `${this.key}_seller_${i}`,
        location: "US",
        raw: { mock: true, mult, multiplier: this.priceMultiplier },
      } satisfies RawListing;
    });
  }
}

function basePrice(query: string): number {
  // Stable pseudo-price in [60, 260) from the query text.
  let h = 0;
  for (const ch of query) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 60 + (h % 200);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
