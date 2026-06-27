import { NextResponse } from "next/server";
import { CheapSharkSource } from "@/lib/sources/cheapshark";
import { EbaySource } from "@/lib/sources/ebay";

// TEMPORARY diagnostic endpoint — surfaces the raw result of each source so we
// can see exactly why eBay returned nothing. Exposes no secrets. Remove after.
export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    env: {
      EBAY_CLIENT_ID: process.env.EBAY_CLIENT_ID
        ? `set (${process.env.EBAY_CLIENT_ID.slice(0, 12)}…)`
        : "MISSING",
      EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET ? "set" : "MISSING",
      EBAY_MARKETPLACE_ID: process.env.EBAY_MARKETPLACE_ID ?? "(default EBAY_US)",
    },
  };

  try {
    const r = await new EbaySource().search({
      query: "Jordan 4 Retro Bred",
      category: "sneakers",
      limit: 5,
    });
    result.ebay = {
      ok: true,
      count: r.length,
      sample: r.slice(0, 3).map((x) => ({ title: x.title, price: x.price })),
    };
  } catch (e) {
    result.ebay = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const r = await new CheapSharkSource().search({ query: "Elden Ring", category: "games", limit: 3 });
    result.cheapshark = { ok: true, count: r.length };
  } catch (e) {
    result.cheapshark = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(result);
}
