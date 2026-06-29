# SNAG

**SNAG is a personal agent that watches eBay for the sneakers you want and flags the genuinely good deals** — so you decide and buy, without doing the hunting.

It's a price/availability **watcher**, not a checkout bot: it surfaces public listings for a human to act on. **No auto-buying.**

## The loop

```
add a sneaker to your watchlist
   -> SNAG searches eBay
   -> strict-matches real listings (brand · model · colourway · gender · size)
   -> flags the ones priced below market
   -> shows a deal card  (email alerts coming next)
```

## Architecture

Source-agnostic pipeline behind one `ListingSource` interface, so adding a site never touches the matching, deal, or scheduling logic.

| File | Responsibility |
| --- | --- |
| `src/lib/types.ts` | Shared domain types |
| `src/lib/sources/source.ts` | `ListingSource` interface + registry |
| `src/lib/sources/ebay.ts` | eBay Browse API adapter (live) |
| `src/lib/sources/mock.ts` | Offline fake source (dev/tests) |
| `src/lib/sources/active.ts` | Picks eBay when configured, else mock |
| `src/lib/match.ts` | Strict matcher: every term + gender + size |
| `src/lib/deal.ts` | Is it a good deal, and why? |
| `src/lib/watch.ts` | The watch loop (depends only on a `Store`) |
| `src/lib/store/*` | Supabase store (live) + in-memory (fallback) |
| `app/api/cron/watch` | Runs one watch pass — Vercel Cron / pg_cron ready |

## Matching (strict)

A listing matches only if its title contains **every descriptive word** searched
(brand, model, model number, colourway), plus the **right gender**, plus a
**compatible size** — e.g. "Jordan 4" never returns a Jordan 13, "womens" never
returns men's. Replica/bootleg listings are dropped, and eBay results are limited
to **Buy-It-Now** so auction bids can't masquerade as deals.

## "Good deal" logic

In preference order: **cross-site** → **below current market** (median asking
price) → **recent-low history** → **max-price ceiling**. Threshold default 10%
(`SNAG_GOOD_DEAL_PCT`).

## Stack

- **DB:** Supabase (Postgres) — server-side via the service role; RLS on, no public access
- **App:** Next.js on Vercel
- **Source:** eBay Browse API (sneakers)

## Run it

```bash
npm install
npm run pipeline:smoke   # end-to-end against the mock source (no network/DB)
npm test                 # unit tests
npm run typecheck
```

## Env

See `.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EBAY_CLIENT_ID`,
`EBAY_CLIENT_SECRET`, `CRON_SECRET`, `SNAG_GOOD_DEAL_PCT`.

## Status

- [x] Schema + source-adapter pipeline + strict matcher + good-deal logic
- [x] Supabase project + schema (RLS, hardened)
- [x] Next.js app + deployed live on Vercel
- [x] eBay live (sneakers) — real listings flowing
- [x] `/api/cron/watch` endpoint (auto-check foundation)
- [ ] Scheduled 24/7 watching (Vercel Cron / pg_cron)
- [ ] Email alerts
