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
}

const RESEND_URL = "https://api.resend.com/emails";

export async function sendDealAlerts(pending: PendingAlert[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.SNAG_ALERT_EMAIL?.trim();
  if (!apiKey || !to || pending.length === 0) return false;

  const rows = pending
    .map((p) => {
      const pct = p.dealScore ? ` · ${Math.round(p.dealScore * 100)}% under` : "";
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #262626;">
          <div style="color:#a3a3a3;font-size:12px;margin-bottom:2px;">${escapeHtml(p.itemTitle)}</div>
          <a href="${p.url}" style="color:#f5f5f5;font-weight:600;text-decoration:none;">${escapeHtml(p.listingTitle)}</a>
          <div style="margin-top:6px;">
            <span style="color:#34d399;font-weight:700;">$${p.price.toFixed(2)}</span>
            <span style="color:#a3a3a3;font-size:12px;"> ${p.condition ? `· ${escapeHtml(p.condition)}` : ""}${pct}</span>
          </div>
          <div style="color:#a3a3a3;font-size:12px;margin-top:4px;">${escapeHtml(p.reason)}</div>
        </td>
      </tr>`;
    })
    .join("");

  const html = `
  <div style="background:#0a0a0a;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;">
    <h1 style="color:#f5f5f5;font-size:20px;margin:0 0 4px;">SNAG<span style="color:#34d399;">.</span></h1>
    <p style="color:#a3a3a3;font-size:13px;margin:0 0 16px;">${pending.length} new deal${pending.length > 1 ? "s" : ""} on your watchlist 👟</p>
    <table style="width:100%;border-collapse:collapse;background:#171717;border-radius:12px;">${rows}</table>
    <p style="color:#525252;font-size:11px;margin-top:16px;">You're getting this because SNAG found listings below market for items you watch.</p>
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
        subject: `SNAG: ${pending.length} new deal${pending.length > 1 ? "s" : ""} found 👟`,
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
