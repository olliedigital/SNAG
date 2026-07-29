import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import type { PendingAlert } from "./notify";

// Native push via APNs token-based auth (HTTP/2 + a .p8 signing key). Active
// only when the APNS_* env vars are set; callers fail open otherwise — exactly
// like the email path. Secrets live in env, never in the repo.
//
//   APNS_KEY_ID       – the 10-char Key ID of your APNs auth key
//   APNS_TEAM_ID      – your Apple Developer Team ID
//   APNS_P8_BASE64    – the .p8 file, base64-encoded
//   APNS_BUNDLE_ID    – the app's bundle id (the APNs "topic")

const PROD_HOST = "api.push.apple.com";
const SANDBOX_HOST = "api.sandbox.push.apple.com";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_P8_BASE64 && process.env.APNS_BUNDLE_ID,
  );
}

export interface PushPayload {
  title: string;
  body: string;
  badge?: number;
}

// One summary notification per sweep — a strike win leads if there is one,
// otherwise the freshest deal. Keeps it to a single buzz, not a spam of 16.
export function dealPush(pending: PendingAlert[]): PushPayload {
  const strikes = pending.filter((p) => p.basis === "max_price");
  if (strikes.length > 0) {
    const s = strikes[0];
    const extra = strikes.length > 1 ? ` +${strikes.length - 1} more` : "";
    return { title: "🎯 Your price hit!", body: `${s.itemTitle} snagged at $${s.price.toFixed(0)}${extra}`, badge: pending.length };
  }
  const top = pending[0];
  const pct = top?.dealScore ? ` · ${Math.round(top.dealScore * 100)}% under` : "";
  return {
    title: `${pending.length} new deal${pending.length > 1 ? "s" : ""} 👟`,
    body: top ? `${top.itemTitle} — $${top.price.toFixed(0)}${pct}` : "Fresh deals on your watchlist",
    badge: pending.length,
  };
}

// APNs provider tokens are valid up to 60 min and must not be refreshed more
// than once per 20 min — cache for 50.
let cachedJwt: { token: string; at: number } | null = null;

async function providerToken(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && now - cachedJwt.at < 50 * 60_000) return cachedJwt.token;
  const pem = Buffer.from(process.env.APNS_P8_BASE64!, "base64").toString("utf8");
  const key = await importPKCS8(pem, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APNS_KEY_ID! })
    .setIssuer(process.env.APNS_TEAM_ID!)
    .setIssuedAt()
    .sign(key);
  cachedJwt = { token, at: now };
  return token;
}

function postOnce(
  host: string,
  deviceToken: string,
  jwt: string,
  body: string,
): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", reject);
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": process.env.APNS_BUNDLE_ID!,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let data = "";
    req.on("response", (h) => (status = Number(h[":status"]) || 0));
    req.setEncoding("utf8");
    req.on("data", (d) => (data += d));
    req.on("end", () => {
      client.close();
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {
        /* empty body on 200 */
      }
      resolve({ status, reason });
    });
    req.on("error", (e) => {
      client.close();
      reject(e);
    });
    req.end(body);
  });
}

// Send one alert to many device tokens. Tries production first, falls back to
// sandbox for dev-build tokens. Returns tokens APNs says are dead so the caller
// can prune them. Never throws.
export async function sendPush(tokens: string[], payload: PushPayload): Promise<{ sent: number; dead: string[] }> {
  if (!pushConfigured() || tokens.length === 0) return { sent: 0, dead: [] };

  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      ...(payload.badge != null ? { badge: payload.badge } : {}),
    },
  });

  let jwt: string;
  try {
    jwt = await providerToken();
  } catch (err) {
    console.error("[snag] APNs token signing failed:", err instanceof Error ? err.message : err);
    return { sent: 0, dead: [] };
  }

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    tokens.map(async (t) => {
      try {
        let res = await postOnce(PROD_HOST, t, jwt, body);
        // A token minted by a dev build only works against sandbox (and vice
        // versa); retry the other environment before giving up on it.
        if (res.status === 400 && res.reason === "BadDeviceToken") {
          res = await postOnce(SANDBOX_HOST, t, jwt, body);
        }
        if (res.status === 200) sent++;
        else if (res.status === 410 || res.reason === "BadDeviceToken" || res.reason === "Unregistered") dead.push(t);
        else console.error(`[snag] APNs ${res.status} ${res.reason ?? ""} for token ${t.slice(0, 8)}…`);
      } catch (err) {
        console.error("[snag] APNs send error:", err instanceof Error ? err.message : err);
      }
    }),
  );
  return { sent, dead };
}
