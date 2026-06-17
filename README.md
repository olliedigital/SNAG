# SNAG

**SNAG is a personal agent that watches trusted shopping sites 24/7 for the specific sneakers and games you want, and flags the good deals** — so you decide and buy, without doing the hunting.

It's a price/availability **watcher**, not a checkout bot: it surfaces public listings for a human to act on. **No auto-buying in v1.**

> The bigger idea: _agents as the primary user_ — software whose main job is for an AI to do work on a human's behalf. Today SNAG reads listing sites for you; the long-term vision is SNAG talking directly to stores' own agents.

## The v1 loop

```
add to watchlist  ->  SNAG watches 24/7  ->  finds a match  ->  shows a card  ->  you decide
                          (scheduled            (matcher +        (price, source,
                           poll per item)        deal logic)       good-deal signal)
```

## Architecture

The pipeline is **source-agnostic**: every site is a plug-in behind one
interface, so adding/swapping a site never touches the matching, deal, or
scheduling logic.

```
WatchlistItem ──> [ ListingSource.search() ] ──> RawListing[]
                       (mock | ebay | …)
                                │
                       matchListing()  ── conservative title/attribute match
                                │
                       assessDeal()    ── 1) cross-site  2) history  3) max-price
                                │
                          alerts ──────> the card the user sees / gets notified about
```

Modules (`src/lib`):

| File | Responsibility |
| --- | --- |
| `types.ts` | Shared domain types |
| `sources/source.ts` | `ListingSource` interface + registry |
| `sources/mock.ts` | Offline fake source (dev/tests) |
| `sources/ebay.ts` | eBay Browse API adapter (real) |
| `match.ts` | Does a found listing match a watchlist item? |
| `deal.ts` | Is it a good deal, and why? |
| `watch.ts` | The watch loop (depends only on a `Store` interface) |

## Data model

Postgres / Supabase — see `supabase/migrations/0001_init.sql`:
`sources`, `watchlist_items`, `listings`, `price_points`, `alerts`. RLS is
enabled on every table; v1 runs server-side with the service role and ships
with no anon policies (added in Phase 1.5 with Supabase Auth).

## "Good deal" logic

In preference order:

1. **cross_site** — cheaper than the same item on other watched sites _right now_.
2. **history** — at/below the recent low (interim rule while only one site is live).
3. **max_price** — at/below a ceiling the user set.

The threshold (default 10% below reference) is configurable via `SNAG_GOOD_DEAL_PCT`.

## Stack

- **Backend/DB:** Supabase (Postgres)
- **App:** Next.js on Vercel _(coming next)_
- **Watcher:** a trigger-agnostic endpoint (`/api/cron/watch`) callable by Vercel
  Cron **or** Supabase `pg_cron` — whichever gives the polling frequency we need.

## Run it

```bash
npm install
npm run pipeline:smoke   # end-to-end run against the mock sources (no network/DB)
npm run test             # unit tests
npm run typecheck
```

## Site choice (v1)

- **Anchor: eBay Browse API** — one official, free, OAuth, ToS-clean API covering
  **both** sneakers and games; large new + used inventory makes the cross-listing
  price spread meaningful from day one.
- **Second source (cross-site):** Best Buy (new games) or CheapShark (digital games).
- **Avoid for v1:** StockX / GOAT (gated / bot-hostile), Amazon PA-API (sales-gated).

See `docs/DECISIONS.md`. _API specifics are flagged VERIFY-LIVE in `sources/ebay.ts`._

## Guardrails

- Show-only — the user always makes the buy decision.
- Watchlist-driven — no taste-learning yet.
- Honor each site's ToS; prefer official APIs. No bot-hostile sites in v1.

## Status

- [x] Schema + source-adapter pipeline + good-deal logic (this commit)
- [x] Offline end-to-end smoke + unit tests
- [ ] Supabase project + apply migration
- [ ] eBay credentials + live adapter verification
- [ ] Next.js app: watchlist UI + alert cards
- [ ] Scheduled watcher wired to the DB
- [ ] Notifications (email / Slack)
