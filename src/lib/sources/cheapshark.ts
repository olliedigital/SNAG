import type { RawListing, SearchParams } from "../types";
import type { ListingSource } from "./source";

// CheapShark — free public aggregator of digital PC game deals across ~30 stores.
// No API key required. Docs: https://apidocs.cheapshark.com
// Perfect fit for SNAG's "games" category: one call returns the same game at many
// stores, so there's a real cross-store price spread to flag deals against.
const BASE = "https://www.cheapshark.com/api/1.0";

export class CheapSharkSource implements ListingSource {
  readonly key = "cheapshark";
  readonly name = "CheapShark";

  async search(params: SearchParams): Promise<RawListing[]> {
    if (params.category !== "games") return []; // digital PC games only

    const url = new URL(`${BASE}/deals`);
    url.searchParams.set("title", params.query);
    url.searchParams.set("pageSize", String(Math.min(params.limit ?? 20, 30)));
    url.searchParams.set("sortBy", "Price");
    if (typeof params.maxPrice === "number") {
      url.searchParams.set("upperPrice", String(Math.ceil(params.maxPrice)));
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "SNAG/0.1 (personal deal watcher)" },
    });
    if (!res.ok) throw new Error(`CheapShark search failed: ${res.status}`);
    const deals = (await res.json()) as CheapSharkDeal[];

    return deals
      .map((d) => {
        const store = STORE_NAMES[d.storeID] ?? `Store ${d.storeID}`;
        return {
          sourceListingId: d.dealID,
          title: `${d.title} — ${store}`,
          url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
          price: Number(d.salePrice),
          currency: "USD",
          condition: "new",
          imageUrl: d.thumb,
          seller: store,
          location: "digital",
          raw: d,
        } satisfies RawListing;
      })
      .filter((l) => Number.isFinite(l.price) && l.price > 0);
  }
}

interface CheapSharkDeal {
  dealID: string;
  title: string;
  storeID: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  thumb: string;
}

// Common CheapShark store IDs -> names (fallback handles the rest).
const STORE_NAMES: Record<string, string> = {
  "1": "Steam",
  "2": "GamersGate",
  "3": "Green Man Gaming",
  "7": "GOG",
  "8": "Origin",
  "11": "Humble Store",
  "13": "Ubisoft Store",
  "15": "Fanatical",
  "21": "WinGameStore",
  "23": "GameBillet",
  "24": "Voidu",
  "25": "Epic Games",
  "27": "Gamesplanet",
  "30": "IndieGala",
  "31": "Blizzard",
  "33": "DLGamer",
};
