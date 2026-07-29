import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/store";

// The iOS app POSTs its APNs device token here after registering for push.
// Same-origin (the app loads this site in its WebView), so no CORS needed.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; platform?: string };
  try {
    body = (await req.json()) as { token?: string; platform?: string };
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const token = String(body?.token ?? "").trim();
  // APNs hex tokens are 64+ chars; guard against junk.
  if (!token || token.length < 32) return NextResponse.json({ error: "missing token" }, { status: 400 });
  const platform = String(body?.platform ?? "ios").slice(0, 20);

  await getStore().saveDeviceToken(token, platform);
  return NextResponse.json({ ok: true });
}
