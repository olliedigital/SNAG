# SNAG — Decision Log

Carried over from the concept handoff, plus decisions made during the build.

## From the concept phase (locked)

- **Show-only.** SNAG surfaces deals; the user always makes the buy decision.
  No auto-buy in v1 (rejected for payment/auth/liability risk + complexity).
- **Watchlist-driven.** The user states exactly what to hunt. Taste-learning /
  discovery is deferred.
- **"Good deal" = cross-site comparison.** Judge price by comparing the same
  item across the trusted sites we watch; no separate "normal price" DB in v1.
- **Start tiny.** One category, one or two API-friendly sites, the full loop
  end-to-end before expanding.
- **Stack.** Supabase + an always-on scheduled worker. App on Vercel.

## Build-phase decisions (2026-06-17)

### D1 — Source-adapter architecture
Every site implements one `ListingSource` interface; match/deal/schedule logic is
source-agnostic. **Why:** makes the "which site" question low-stakes and swappable,
and lets us build & test the whole pipeline offline against a mock source before
any credentials exist.

### D2 — First site: eBay Browse API _(recommended; VERIFY-LIVE)_
One official, free, OAuth, ToS-clean API covering **both** sneakers and games,
with deep new + used inventory → cross-listing price spread is meaningful
immediately. **Second source** for true cross-site comparison: Best Buy (new
games) or CheapShark (digital games). **Avoid v1:** StockX/GOAT (gated /
bot-hostile), Amazon PA-API (affiliate-sales-gated).
> Built from prior knowledge — API scopes, rate limits, and ToS specifics are
> marked VERIFY-LIVE in `src/lib/sources/ebay.ts` and must be confirmed against
> current eBay docs before production use. (Initial research pass was cut short by
> a session limit; recommendation stands on knowledge + clear caveats.)

### D3 — Good-deal rule
Cross-site first; **history (lowest-in-N-days)** as the interim rule while only
one site is live; **max-price ceiling** as a user override. Threshold default 10%
(`SNAG_GOOD_DEAL_PCT`). **Why:** the cross-site signal needs ≥2 sites, so we need
a sensible single-site fallback for the very first launch.

### D4 — Watcher hosting: trigger-agnostic endpoint
The watch loop is plain TypeScript exposed at `/api/cron/watch`, callable by
Vercel Cron **or** Supabase `pg_cron`. **Why:** keeps everything in one
Node/TypeScript codebase and one deploy, while leaving polling frequency open
(Vercel Cron is simplest; `pg_cron` can hit sub-minute intervals if needed).

### D5 — Category first: open
eBay serves both, so the adapter/schema are category-agnostic and the choice is
not blocking. Slight lean to **games** (cleaner titles/UPCs → easier matching)
unless sneakers is the priority demo.

## Open / to confirm

- **Notification channel** (email via Gmail / Slack / in-app) — both wired in this env.
- **Polling frequency** (freshness vs. rate limits).
- **Supabase project** — none named `snag` yet; create fresh (has a cost → confirm first).
