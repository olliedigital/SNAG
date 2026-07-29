import { NextResponse, type NextRequest } from "next/server";
import { pushConfigured, sendPush } from "@/lib/push";
import { getStore } from "@/lib/store";

// On-demand test push to every registered device. Gated by CRON_SECRET so it
// isn't public. Trigger it with:
//   curl "https://<app>/api/push-test" -H "Authorization: Bearer <CRON_SECRET>"
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: "push not configured (set APNS_* env vars)" }, { status: 400 });
  }

  const store = getStore();
  const tokens = await store.getDeviceTokens();
  const { sent, dead } = await sendPush(tokens, {
    title: "🎯 SNAG is live",
    body: "Push notifications are working — the hunt never sleeps.",
    badge: 1,
  });
  await Promise.all(dead.map((t) => store.removeDeviceToken(t)));

  return NextResponse.json({ ok: true, registered: tokens.length, sent, pruned: dead.length });
}
