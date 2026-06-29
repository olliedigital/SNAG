import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/store";

// The watch endpoint: runs one pass of watch -> match -> deal for every active
// watchlist item. Trigger-agnostic — callable by Vercel Cron, Supabase pg_cron,
// or the "Check for deals now" button. If CRON_SECRET is set, a matching
// `Authorization: Bearer <secret>` header is required.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await getStore().runCheck();
  return NextResponse.json({ ok: true, summary });
}
