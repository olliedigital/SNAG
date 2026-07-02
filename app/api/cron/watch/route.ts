import { NextResponse, type NextRequest } from "next/server";
import { emailConfigured, sendDealAlerts } from "@/lib/notify";
import { getStore } from "@/lib/store";

// The watch endpoint: runs one pass of watch -> match -> deal for every active
// watchlist item, then emails any not-yet-notified deals. Triggered hourly by
// Vercel Cron (see vercel.json); Vercel sends `Authorization: Bearer CRON_SECRET`
// automatically when that env var exists.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const summary = await store.runCheck();

  let emailed = 0;
  if (emailConfigured()) {
    const pending = await store.getPendingAlerts();
    if (pending.length > 0 && (await sendDealAlerts(pending))) {
      await store.markAlertsSent(pending.map((p) => p.id));
      emailed = pending.length;
    }
  }

  return NextResponse.json({ ok: true, summary, emailed });
}
