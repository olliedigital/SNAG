// Email alerts via Resend's REST API (no SDK needed). Active only when
// RESEND_API_KEY + SNAG_ALERT_EMAIL are set; callers fail open otherwise.
export interface PendingAlert {
  id: string;
  itemTitle: string;
  listingTitle: string;
  url: string;
  price: number;
  condition?: string;
  reason: string;
  dealScore?: number;
  basis?: string; // "max_price" => a strike win (SNAGGED)
}

const RESEND_URL = "https://api.resend.com/emails";

export async function sendDealAlerts(pending: PendingAlert[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.SNAG_ALERT_EMAIL?.trim();
  if (!apiKey || !to || pending.length === 0) return false;

  const rows = pending
    .map((p) => {
      const pct = p.dealScore ? ` · ${Math.round(p.dealScore * 100)}% under` : "";
      const isStrike = p.basis === "max_price";
      // The whole row is wrapped by an anchor-styled button too, but the primary
      // tap target is the big CTA — one click from the phone to the listing.
      const tag = isStrike
        ? `<div style="display:inline-block;background:#f0c94a;color:#1a1405;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:6px;">🎯 Snagged — your strike hit</div><br>`
        : "";
      const btnBg = isStrike ? "#f0c94a" : "#34d399";
      const btnColor = isStrike ? "#1a1405" : "#0a0a0a";
      const btnLabel = isStrike ? "Claim it →" : "View listing →";
      return `<tr>
        <td style="padding:14px 16px;border-bottom:1px solid #262626;">
          ${tag}
          <div style="color:#a3a3a3;font-size:12px;margin-bottom:2px;">${escapeHtml(p.itemTitle)}</div>
          <a href="${p.url}" style="color:#f5f5f5;font-weight:600;text-decoration:none;font-size:15px;">${escapeHtml(p.listingTitle)}</a>
          <div style="margin-top:6px;">
            <span style="color:${isStrike ? "#f0c94a" : "#34d399"};font-weight:700;font-size:16px;">$${p.price.toFixed(2)}</span>
            <span style="color:#a3a3a3;font-size:12px;"> ${p.condition ? `· ${escapeHtml(p.condition)}` : ""}${pct}</span>
          </div>
          <div style="color:#a3a3a3;font-size:12px;margin-top:4px;">${escapeHtml(p.reason)}</div>
          <a href="${p.url}" style="display:inline-block;margin-top:12px;padding:10px 20px;border-radius:8px;background:${btnBg};color:${btnColor};font-weight:700;font-size:14px;text-decoration:none;">${btnLabel}</a>
        </td>
      </tr>`;
    })
    .join("");

  const strikes = pending.filter((p) => p.basis === "max_price").length;
  const heading = strikes > 0 ? `${strikes} strike${strikes > 1 ? "s" : ""} hit + ${pending.length - strikes} more deal${pending.length - strikes === 1 ? "" : "s"} 🎯` : `${pending.length} new deal${pending.length > 1 ? "s" : ""} on your watchlist 👟`;
  const html = `
  <div style="background:#0a0a0a;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;">
    <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 4px;">SNAG<span style="color:#34d399;">.</span></h1>
    <p style="color:#a3a3a3;font-size:13px;margin:0 0 16px;">${heading}</p>
    <table style="width:100%;border-collapse:collapse;background:#171717;border-radius:12px;">${rows}</table>
    <p style="color:#525252;font-size:11px;margin-top:16px;">You're getting this because SNAG found listings below market for items you watch. Tap any deal to go straight to the listing.</p>
  </div>`;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Default test sender delivers only to the Resend account's own email;
        // set SNAG_EMAIL_FROM to an address on a verified domain to send anywhere.
        from: process.env.SNAG_EMAIL_FROM?.trim() || "SNAG <onboarding@resend.dev>",
        to: [to],
        subject:
          strikes > 0
            ? `SNAG: 🎯 your price hit${strikes > 1 ? ` on ${strikes} pairs` : ""}!`
            : `SNAG: ${pending.length} new deal${pending.length > 1 ? "s" : ""} found 👟`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[snag] email send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[snag] email send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.SNAG_ALERT_EMAIL);
}
