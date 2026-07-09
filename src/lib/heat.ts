import type { PriceStats } from "./store";

// How hot / exclusive a single deal is — derived only from signals we can stand
// behind: where this price ranks among every listing we track for the shoe, how
// deep the discount is, and how fresh the drop is. No invented "N people
// watching" — SNAG is a private agent, so there's no crowd to count.
export interface DealHeat {
  count: number; // listings tracked for this shoe
  rank: number; // 1-based price rank (1 = cheapest); 0 if unknown
  isFloor: boolean; // the cheapest tracked price
  minutes: number; // since the deal surfaced
  fresh: boolean; // surfaced very recently
  level: 0 | 1 | 2 | 3; // heat level -> flame count
  levelLabel: string; // "", "Rising", "Hot", "Blazing"
  chip: { text: string; tone: "live" | "gold" } | null; // headline urgency chip
  scarcity: string; // compact scarcity line, e.g. "Cheapest of 9 · 6m ago"
}

export function dealHeat(price: number, createdAt: number, pct: number, stats?: PriceStats): DealHeat {
  const count = stats?.count ?? 0;
  let rank = 0;
  let isFloor = false;
  if (stats) {
    if (stats.prices?.length) rank = stats.prices.filter((p) => p < price - 0.01).length + 1;
    isFloor = price <= stats.min + 0.5;
    if (!rank && isFloor) rank = 1;
  }

  const minutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));
  const fresh = minutes <= 20;

  // Heat points from real factors, capped at 3 flames.
  let pts = 0;
  if (pct >= 15) pts++;
  if (pct >= 28) pts++;
  if (isFloor) pts++;
  if (fresh) pts++;
  const level = Math.min(3, pts) as 0 | 1 | 2 | 3;
  const levelLabel = level >= 3 ? "Blazing" : level === 2 ? "Hot" : level === 1 ? "Rising" : "";

  // The single most compelling *true* urgency chip (only when it earns one).
  // Rank lives in the scarcity line below, so the chip stays a pure
  // liveness/heat marker and never repeats it.
  let chip: DealHeat["chip"] = null;
  if (fresh && minutes <= 12) chip = { text: "Just found", tone: "gold" };
  else if (isFloor && count >= 4) chip = { text: "Lowest live", tone: "live" };
  else if (level >= 2) chip = { text: levelLabel, tone: "live" };

  // Rank framed as value, never as a discouraging "#7 of 9".
  let rankStr: string;
  if (count < 2) rankStr = "Only one on the board";
  else if (isFloor) rankStr = `Cheapest of ${count}`;
  else if (rank && count > rank) rankStr = `${count - rank} listed higher`;
  else rankStr = `${count} tracked`;

  return { count, rank, isFloor, minutes, fresh, level, levelLabel, chip, scarcity: `${rankStr} · ${fmtAgo(minutes)}` };
}

// Roll minutes up to m/h/d so old deals read "5d ago", not "6975m ago".
function fmtAgo(min: number): string {
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function flames(level: number): string {
  return level <= 0 ? "" : "🔥".repeat(level);
}
