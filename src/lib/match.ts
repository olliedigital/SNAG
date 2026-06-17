import type { RawListing, WatchlistItem } from "./types";

export interface MatchResult {
  isMatch: boolean;
  score: number; // 0..1 confidence
  reasons: string[]; // why it matched / didn't (for debugging + transparency)
}

// Conservative matcher: a source search is fuzzy, so we re-check each listing
// against the item's tokens, required/excluded words, and attributes.
// Bias: prefer a miss over a false match — don't spam the user.
export function matchListing(item: WatchlistItem, listing: RawListing): MatchResult {
  const reasons: string[] = [];
  const hay = normalize(listing.title);
  const attrs = item.attributes ?? {};

  // Hard excludes first.
  for (const bad of attrs.mustExclude ?? []) {
    if (hay.includes(normalize(bad))) {
      return { isMatch: false, score: 0, reasons: [`excluded term "${bad}"`] };
    }
  }

  // Explicit required tokens must all be present.
  const required = (attrs.mustInclude ?? []).map(normalize);
  for (const need of required) {
    if (!hay.includes(need)) {
      return { isMatch: false, score: 0, reasons: [`missing required "${need}"`] };
    }
  }

  // Token overlap from the query.
  const queryTokens = tokenize(item.query);
  const present = queryTokens.filter((t) => hay.includes(t));
  const overlap = queryTokens.length ? present.length / queryTokens.length : 0;
  reasons.push(`${present.length}/${queryTokens.length} query tokens`);

  // Attribute checks (only enforced when the attribute is specified).
  let attrPenalty = 0;
  if (isNonEmpty(attrs.platform) && !hay.includes(normalize(attrs.platform))) {
    attrPenalty += 0.5;
    reasons.push(`platform "${attrs.platform}" not found`);
  }
  if (isNonEmpty(attrs.size) && !sizeMatches(hay, attrs.size)) {
    attrPenalty += 0.5;
    reasons.push(`size "${attrs.size}" not found`);
  }

  const score = clamp01(overlap - attrPenalty);
  const isMatch = score >= 0.6;
  return { isMatch, score, reasons };
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}
function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1);
}
function sizeMatches(hay: string, size: string): boolean {
  // Match "10", "10.5", "size 10", "us 10", "10w".
  const s = normalize(size).replace(".", "\\.");
  return new RegExp(`(^| )(us |size |sz )?${s}( |w|$)`).test(hay);
}
function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
