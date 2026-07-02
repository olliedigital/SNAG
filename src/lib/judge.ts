import { generateText } from "ai";
import type { WatchlistItem } from "./types";

// AI listing-judge: given the user's search and a batch of listing titles,
// returns the indices that are GENUINELY the wanted shoe (a real pair, right
// model, right colourway). Catches what phrase filters can't — e.g. sellers
// keyword-stuffing "Bred Cement" onto a different colourway.
//
// Returns null on any failure so callers FAIL OPEN (keep strict-match results).
// Runs on Vercel's AI Gateway — authenticated automatically on deployments, so
// no extra API key is needed there.
export type ListingJudge = (item: WatchlistItem, titles: string[]) => Promise<Set<number> | null>;

const MODEL = process.env.SNAG_JUDGE_MODEL ?? "anthropic/claude-haiku-4.5";

export const judgeListings: ListingJudge = async (item, titles) => {
  if (titles.length === 0) return new Set();
  try {
    const numbered = titles.map((t, i) => `${i}. ${t}`).join("\n");
    const { text } = await generateText({
      model: MODEL,
      prompt: [
        `You are a strict sneaker-listing checker for a deal-hunting app.`,
        `The user is hunting for: "${item.query}"`,
        ``,
        `eBay listing titles:`,
        numbered,
        ``,
        `Return ONLY a JSON array of the numbers whose listing is genuinely a PAIR of the exact model and colourway the user wants.`,
        `Exclude: different colourways or model numbers (even when the title name-drops the wanted words), single shoes, empty boxes, accessories, keychains, replicas, customs.`,
        `If you are unsure about a listing, exclude it.`,
      ].join("\n"),
    });
    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) return null;
    const arr = JSON.parse(match[0]) as unknown[];
    return new Set(
      arr.filter((n): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < titles.length),
    );
  } catch (err) {
    console.error("[snag] AI judge failed (fail-open):", err instanceof Error ? err.message : err);
    return null;
  }
};
