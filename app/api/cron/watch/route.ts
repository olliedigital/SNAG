import { NextResponse, type NextRequest } from "next/server";
import { emailConfigured, sendDealAlerts } from "@/lib/notify";
import { dealPush, pushConfigured, sendPush } from "@/lib/push";
import { getStore } from "@/lib/store";

// The watch endpoint: runs one pass of watch -> match -> deal for every active
// watchlist item, then notifies any not-yet-notified deals by email and native
// push. Triggered hourly by Vercel Cron (see vercel.json); Vercel sends
// `Authorization: Bearer CRON_SECRET` automatically when that env var exists.
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
  let pushed = 0;
  const notify = emailConfigured() || pushConfigured();
  const pending = notify ? await store.getPendingAlerts() : [];

  if (pending.length > 0) {
    if (emailConfigured() && (await sendDealAlerts(pending))) emailed = pending.length;

    if (pushConfigured()) {
      const tokens = await store.getDeviceTokens();
      const { sent, dead } = await sendPush(tokens, dealPush(pending));
      pushed = sent;
      await Promise.all(dead.map((t) => store.removeDeviceToken(t)));
    }

    // Mark sent once delivered by any channel, so we don't re-notify next sweep.
    if (emailed > 0 || pushed > 0) await store.markAlertsSent(pending.map((p) => p.id));
  }

  return NextResponse.json({ ok: true, summary, emailed, pushed });
}
