import type { DealAssessment, RawListing, WatchlistItem } from "./types";

export interface DealContext {
  // Lowest current price for the SAME item on OTHER sites this run (cross-site).
  otherSiteLowest?: Record<string, number>;
  // Median asking price across everything matched this run (below-market rule).
  marketReference?: number;
  // Recent observed prices for this item (any site) — the interim single-site rule.
  recentPrices?: number[];
  // Tunables.
  goodDealPct?: number; // how far below reference counts as a deal (default 0.10)
  historyWindowMin?: number; // min history points before trusting the history rule
}

const DEFAULT_GOOD_DEAL_PCT = 0.1;
const DEFAULT_HISTORY_MIN = 3;

// Decide whether an (already matched) listing is a good deal, and why.
// Preference order:
//   1. cross_site — cheaper than the same item on other sites right now
//   2. market     — below the typical asking price across everything matched now
//   3. history    — at/below the recent low (interim rule, esp. for a single site)
//   4. max_price  — user set a ceiling and this is at/below it
export function assessDeal(
  item: WatchlistItem,
  listing: RawListing,
  ctx: DealContext = {},
): DealAssessment {
  const pct = ctx.goodDealPct ?? DEFAULT_GOOD_DEAL_PCT;
  const price = listing.price;

  // 1. Cross-site comparison.
  const others = Object.values(ctx.otherSiteLowest ?? {}).filter((p) => Number.isFinite(p) && p > 0);
  if (others.length > 0) {
    const reference = Math.min(...others);
    const score = (reference - price) / reference;
    if (score >= pct) {
      return {
        isMatch: true,
        isGoodDeal: true,
        dealScore: round3(score),
        referencePrice: reference,
        basis: "cross_site",
        reason: `${pct100(score)} below the cheapest of ${others.length} other site${others.length > 1 ? "s" : ""} ($${reference.toFixed(2)})`,
      };
    }
  }

  // 2. Below the current market (median asking price across matched listings).
  if (typeof ctx.marketReference === "number" && ctx.marketReference > 0) {
    const reference = ctx.marketReference;
    const score = (reference - price) / reference;
    if (score >= pct) {
      return {
        isMatch: true,
        isGoodDeal: true,
        dealScore: round3(score),
        referencePrice: reference,
        basis: "market",
        reason: `${pct100(score)} below the typical asking price ($${reference.toFixed(2)})`,
      };
    }
  }

  // 3. History (interim single-site rule).
  const hist = (ctx.recentPrices ?? []).filter((p) => Number.isFinite(p) && p > 0);
  if (hist.length >= (ctx.historyWindowMin ?? DEFAULT_HISTORY_MIN)) {
    const low = Math.min(...hist);
    const score = (low - price) / low;
    if (price <= low || score >= pct) {
      return {
        isMatch: true,
        isGoodDeal: true,
        dealScore: round3(Math.max(score, 0)),
        referencePrice: low,
        basis: "history",
        reason:
          price <= low
            ? `new low — at or below the cheapest seen in the last ${hist.length} checks ($${low.toFixed(2)})`
            : `${pct100(score)} below the recent low ($${low.toFixed(2)})`,
      };
    }
  }

  // 4. Max-price ceiling.
  if (typeof item.maxPrice === "number" && price <= item.maxPrice) {
    const score = (item.maxPrice - price) / item.maxPrice;
    return {
      isMatch: true,
      isGoodDeal: true,
      dealScore: round3(Math.max(score, 0)),
      referencePrice: item.maxPrice,
      basis: "max_price",
      reason: `at or below your $${item.maxPrice.toFixed(2)} target`,
    };
  }

  // Matched, but not a standout deal yet.
  return {
    isMatch: true,
    isGoodDeal: false,
    reason: "matches your watch, but not below market yet",
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function pct100(n: number): string {
  return `${Math.round(n * 100)}%`;
}
