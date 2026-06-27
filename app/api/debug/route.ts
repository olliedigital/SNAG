import { NextResponse } from "next/server";
import { CheapSharkSource } from "@/lib/sources/cheapshark";
import { EbaySource } from "@/lib/sources/ebay";

// TEMPORARY diagnostic endpoint — surfaces the raw result of each source so we
// can see exactly why eBay returned nothing. Exposes no secrets. Remove after.
export const dynamic = "force-dynamic";

export async function GET() {
  const id = process.env.EBAY_CLIENT_ID ?? "";
  const secret = process.env.EBAY_CLIENT_SECRET ?? "";
  const result: Record<string, unknown> = {
    env: {
      clientId: id
        ? { length: id.length, preview: `${id.slice(0, 14)}…${id.slice(-6)}`, hasWhitespace: id !== id.trim() }
        : "MISSING",
      clientSecret: secret
        ? { length: secret.length, prefix: secret.slice(0, 4), hasWhitespace: secret !== secret.trim() }
        : "MISSING",
      marketplace: process.env.EBAY_MARKETPLACE_ID ?? "(default EBAY_US)",
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
