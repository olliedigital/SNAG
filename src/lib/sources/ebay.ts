import type { RawListing, SearchParams } from "../types";
import { ebaySearchQuery } from "../match";
import { type ListingSource, SourceNotConfiguredError } from "./source";

// eBay Browse API adapter.
//   Search docs: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
//   Auth: OAuth2 client-credentials "Application access token" (public data scope).
//
// VERIFY-LIVE (built from prior knowledge): confirm the marketplace id, OAuth
// scope, rate limits, and category coverage against the current eBay docs
// before relying on this in production.
const OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

export class EbaySource implements ListingSource {
  readonly key = "ebay";
  readonly name = "eBay";

  private tokenCache: TokenCache | null = null;

  constructor(
    private readonly clientId: string | undefined = process.env.EBAY_CLIENT_ID,
    private readonly clientSecret: string | undefined = process.env.EBAY_CLIENT_SECRET,
    private readonly marketplaceId: string = process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
  ) {}

  private async getToken(): Promise<string> {
    // Trim defensively — a stray space/newline pasted into the env var is a
    // classic cause of eBay's "invalid_client" auth failure.
    const clientId = this.clientId?.trim();
    const clientSecret = this.clientSecret?.trim();
    if (!clientId || !clientSecret) {
      throw new SourceNotConfiguredError(this.key, "set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET");
    }
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.token;
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }),
    });
    if (!res.ok) {
      throw new Error(`eBay OAuth failed: ${res.status} ${await safeText(res)}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
    return json.access_token;
  }

  async search(params: SearchParams): Promise<RawListing[]> {
    const token = await this.getToken();
    const url = new URL(BROWSE_URL);
    url.searchParams.set("q", ebaySearchQuery(params.query));
    url.searchParams.set("limit", String(Math.min(params.limit ?? 100, 200)));

    const filters: string[] = ["buyingOptions:{FIXED_PRICE}"];
    if (typeof params.maxPrice === "number") {
      filters.push(`price:[..${params.maxPrice}],priceCurrency:USD`);
    }
    const conditionIds = params.attributes?.conditionIds;
    if (typeof conditionIds === "string" && conditionIds.length > 0) {
      filters.push(`conditionIds:{${conditionIds}}`);
    }
    if (filters.length > 0) url.searchParams.set("filter", filters.join(","));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`eBay Browse search failed: ${res.status} ${await safeText(res)}`);
    }
    const json = (await res.json()) as EbaySearchResponse;
    return (json.itemSummaries ?? [])
      .map(mapItem)
      .filter((l) => Number.isFinite(l.price) && l.price > 0);
  }
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
}
interface EbayItemSummary {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price?: { value: string; currency: string };
  condition?: string;
  image?: { imageUrl: string };
  seller?: { username?: string };
  itemLocation?: { country?: string };
}

function mapItem(it: EbayItemSummary): RawListing {
  return {
    sourceListingId: it.itemId,
    title: it.title,
    url: it.itemWebUrl,
    price: it.price ? Number(it.price.value) : Number.NaN,
    currency: it.price?.currency ?? "USD",
    condition: it.condition,
    imageUrl: it.image?.imageUrl,
    location: it.itemLocation?.country,
    // Deliberately do NOT persist the seller username or the raw payload — keeps
    // SNAG within its "no persisted eBay user data" account-deletion exemption.
    raw: undefined,
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
