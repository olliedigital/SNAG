import type { RawListing, WatchlistItem } from "./types";

export interface MatchResult {
  isMatch: boolean;
  score: number;
  reasons: string[];
}

// Gender word -> canonical gender.
const GENDER: Record<string, string> = {
  men: "men", mens: "men", man: "men", male: "men",
  women: "women", womens: "women", woman: "women", female: "women", wmns: "women",
  kids: "kids", kid: "kids", youth: "kids", boys: "kids", girls: "kids", gs: "kids", ps: "kids", td: "kids",
};
const SIZE_WORDS = new Set(["size", "sz", "us"]);

interface ParsedQuery {
  keywords: string[]; // every one must appear in the title (whole word)
  gender?: string;
  size?: string;
}

// Strict matcher: a listing matches only if its title contains EVERY descriptive
// word the user searched for (brand, model, model number, colourway), AND the
// right gender, AND a compatible size. Honours exactly what was typed — e.g.
// "Jordan 4" never returns a Jordan 13; "womens" never returns men's.
//
// Gender/size are enforced leniently in one direction: a listing is only rejected
// when its title states a *conflicting* gender/size. Titles that omit them are
// kept (size often lives in a listing's variations, not its title).
export function matchListing(item: WatchlistItem, listing: RawListing): MatchResult {
  const titleTokens = tokenSet(listing.title);
  const titleStr = normalize(listing.title);
  const q = parseQuery(item.query);

  for (const bad of item.attributes?.mustExclude ?? []) {
    if (titleTokens.has(clean(normalize(bad)))) {
      return { isMatch: false, score: 0, reasons: [`excluded "${bad}"`] };
    }
  }

  const missing = q.keywords.filter((k) => !titleTokens.has(k));
  if (missing.length > 0) {
    return { isMatch: false, score: 0, reasons: [`missing: ${missing.join(", ")}`] };
  }

  if (q.gender) {
    const tg = titleGender(titleTokens);
    if (tg && tg !== q.gender) {
      return { isMatch: false, score: 0, reasons: [`gender ${tg} != ${q.gender}`] };
    }
  }

  if (q.size) {
    const sizes = titleSizes(titleStr);
    if (sizes.length > 0 && !sizes.includes(q.size)) {
      return { isMatch: false, score: 0, reasons: [`size ${q.size} not offered (${sizes.join(", ")})`] };
    }
  }

  return { isMatch: true, score: 1, reasons: [`matched all ${q.keywords.length} terms`] };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "") // drop apostrophes so "Women's" -> "womens"
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function clean(token: string): string {
  return token.replace(/^\.+|\.+$/g, "");
}
function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(" ").map(clean).filter(Boolean));
}

function parseQuery(query: string): ParsedQuery {
  const tokens = normalize(query).split(" ").map(clean).filter(Boolean);
  const keywords: string[] = [];
  let gender: string | undefined;
  let size: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (GENDER[t]) {
      gender = GENDER[t];
      continue;
    }
    if (SIZE_WORDS.has(t)) {
      const next = tokens[i + 1];
      if (next && isSize(next)) {
        size = next;
        i++;
      }
      continue;
    }
    const width = t.match(/^(\d{1,2}(?:\.\d)?)[wm]$/) ?? t.match(/^[wm](\d{1,2}(?:\.\d)?)$/);
    if (width) {
      size = width[1];
      continue;
    }
    keywords.push(t);
  }
  return { keywords, gender, size };
}

function isSize(t: string): boolean {
  return /^\d{1,2}(\.\d)?$/.test(t) && Number(t) >= 3 && Number(t) <= 20;
}
function titleGender(tokens: Set<string>): string | undefined {
  for (const [word, g] of Object.entries(GENDER)) {
    if (tokens.has(word)) return g;
  }
  return undefined;
}
function titleSizes(titleStr: string): string[] {
  const out: string[] = [];
  for (const m of titleStr.matchAll(/\b(?:size|sz|us)\s*(\d{1,2}(?:\.\d)?)\b/g)) out.push(m[1]);
  for (const m of titleStr.matchAll(/\b(\d{1,2}(?:\.\d)?)[wm]\b/g)) out.push(m[1]);
  return out;
}
