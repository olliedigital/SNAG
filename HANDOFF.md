# SNAG — Session Handoff

_Last updated: this session. Read this first, then continue._

## What SNAG is
A personal sneaker **deal-hunting agent**. It watches eBay + the wider web 24/7, flags below-market listings on the shoes a user watchlists, verifies them with AI (rejects fakes/wrong colorways), and alerts the user by **email + native push**. Built as **Next.js on Vercel + Supabase**, wrapped as a **native iOS app via Capacitor**.

The owner (Oliver) is a relative beginner — make the technical decisions, and give crisp step-by-step for anything he does on his Mac / Apple accounts.

## Live URLs, IDs, accounts
- **Web app (production):** https://snag-eta.vercel.app
- **GitHub:** `olliedigital/SNAG` — working branch **`claude/bold-hamilton-x4pomo`**
  - ⚠️ **This branch IS the Vercel production branch. Pushing to it deploys prod.**
- **Vercel:** project `prj_tEdRDPfSKeDigbHLopNXqPo3Nduw`, team `team_k5pWAcHW8g7Z7yI5WPobl6zl`
- **Supabase:** project `dpxlurefltqzschdefpi` (name "SNAG")
- **Apple:** Team ID `2S77DP7R55` · App Store Connect app "**SNAG: Sneaker Deals**", Apple app id `6796997437` · bundle id **`com.olliedigital.snag`**
- **APNs auth key:** Key ID `BMP3LAP4GQ` (the `.p8` lives ONLY as `APNS_P8_BASE64` in Vercel env — never in the repo)

## Architecture
- **Next.js 15** App Router, TypeScript, **Tailwind v3**. Dark editorial UI: bg `#0b0b0d`, text `#f2f0eb` ("bone"), green `#22c55e` (deals), gold for strike wins. Fonts: **Archivo** (display) + **Inter** (body) via next/font.
- **Supabase** Postgres, RLS on, accessed server-side with the service_role key. Tables: `watchlist_items`, `listings`, `price_points`, `alerts`, `sources`, `device_tokens`.
- **Source adapters** (`src/lib/sources/`): `ebay.ts` (Browse API), `shopping.ts` (Serper/Google Shopping "web scout"), `mock.ts`. AI listing-judge (`src/lib/judge.ts`) via Vercel AI Gateway (`anthropic/claude-haiku-4.5`), fail-open.
- **Cron:** `vercel.json` runs `/api/cron/watch` hourly (Bearer `CRON_SECRET`). It runs the check, emails via **Resend** (`src/lib/notify.ts`), sends **APNs push** (`src/lib/push.ts`), then marks alerts sent.
- **Store factory** (`src/lib/store/`): `getStore()` picks `SupabaseStore` when env is present, else `MemoryStore`. Interface in `store.ts`.
- **iOS (Capacitor 8.4.1):** `capacitor.config.ts` loads the **live site via `server.url`** — so **web changes deploy instantly to the app; only native changes (icon, plugins, config) need a new build + upload.** App is **iPhone-only** (iPad support removed). Plugins: push-notifications, app, splash-screen, status-bar.
- **Push:** `PushRegistrar.tsx` (client, mounted in layout) registers the device token when running natively → `POST /api/register-device` → `device_tokens`. `src/lib/push.ts` signs the APNs provider JWT (jose ES256) and sends over HTTP/2, **trying production then falling back to sandbox** per token. `/api/push-test` fires a test push to all devices — auth via `Authorization: Bearer <CRON_SECRET>` OR `?key=<CRON_SECRET>` (so it can be fired from a phone browser for the demo).

## Env vars (all set in Vercel)
Supabase URL + service key · `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` · `SERPER_API_KEY` · AI gateway key · `RESEND_API_KEY` · `SNAG_ALERT_EMAIL` (oliver@revcaplending.com — Resend test mode only delivers to the account owner) · `SNAG_EMAIL_FROM` · `CRON_SECRET` · `APNS_KEY_ID` · `APNS_TEAM_ID` · `APNS_P8_BASE64` · `APNS_BUNDLE_ID` (`com.olliedigital.snag`).

## ⭐ CURRENT FOCUS: App Store submission (rejected — fixing to resubmit)
Timeline: submitted **Aug 8**; sat 15 days in "Waiting for Review" due to an **incomplete DSA Trader Status** (now completed); reviewed **Aug 25** → **REJECTED** on two guidelines:

### 1. Guideline 2.3.8 — placeholder icon
The build still carried Capacitor's placeholder icon. **Fix is ready:** a real SNAG icon has been generated → **`design/AppIcon-1024.png`** in the repo (green hook mark on `#0b0b0d`, matches the `SnagMark` component).
**Remaining (on the Mac, in Xcode):** add it in **Assets.xcassets → AppIcon** (set AppIcon to "Single Size", drop the 1024 png in) → bump **Build number to 3** (General → Identity; last uploaded was "1.0 (2)") → **Product → Archive → Distribute → Upload**. Oliver was mid-doing this and got confused about the home-screen icon not changing (normal — it only updates after rebuild/reinstall or once build 3 is uploaded).

### 2. Guideline 4.2 — minimum functionality ("it's basically a website")
The classic web-wrapper rejection. **Plan (3 prongs):**
- **(a) Demo video — highest-leverage.** Oliver records his phone: open SNAG → add a watch ("Jordan 4 Bred") → set a strike → deals populate → then fire a push live from the phone browser via `https://snag-eta.vercel.app/api/push-test?key=<CRON_SECRET>` to capture the notification arriving. Attach in the reply.
- **(b) Added functionality — DONE & deployed** (commit `057b532`): **price-trend sparkline** (`Sparkline.tsx` + `getPriceTrends()` in the store, showing daily best price over time = ongoing market analysis) and **first-run onboarding** (`HowItWorks.tsx`).
- **(c) Reply to Apple** in the Resolution Center (draft below), + attach the video.

### Draft reply to Apple (paste in App Store Connect → the rejection message → Reply)
> Thank you for the review.
>
> **2.3.8:** You're correct — the prior build carried a placeholder icon. The new build includes our finalized SNAG app icon.
>
> **4.2:** We'd like to clarify SNAG's functionality, which may not be apparent on first launch. SNAG is not a shopping catalog — it is a personalized, always-on deal-monitoring agent:
> • Users specify an exact sneaker (model, size, gender, colorway); SNAG's AI verification matches only genuine listings and rejects keyword-stuffed fakes.
> • Users set a target "strike" price and receive a native push notification the instant any marketplace has the shoe at or below it.
> • SNAG continuously scans multiple marketplaces every hour, compares each listing to the current market average, and surfaces only below-market deals — with an analysis of how far under market each one is, and a price-history trend per shoe.
> • This lets users do something no single marketplace app allows: set a price target for a specific pair and be alerted the moment it appears below market anywhere, with verified authenticity.
>
> To experience it: add a sneaker (e.g. "Jordan 4 Bred"), set a strike price, and the agent populates live verified deals and sends a push notification on a match. A short demo video of this flow is attached.
>
> We've also expanded onboarding and added price-trend analysis in this build. We welcome any specific guidance. Thank you.

## Immediate next steps (in order)
1. **Icon → Xcode:** add `design/AppIcon-1024.png` to AppIcon → Build 3 → Archive → Upload.
2. **Record the demo video** (script above; fire push via the `?key=` URL).
3. **Reply to Apple** (draft above) + attach video.
4. **Resubmit** (select build 3, then Add for Review → Submit).

## Notable state
- **Push not yet activated on a device:** the full pipeline is built + deployed, but `device_tokens` is empty (0) because the app hasn't been run on a physical iPhone with notifications allowed yet. It registers automatically the first time the app runs on-device and Oliver taps "Allow." (Recording the demo will naturally do this.)
- Tests: `npm test` (vitest) — 20 passing. `npm run build` compiles clean.

## Gotchas / house rules
- **Branch = production.** Pushing `claude/bold-hamilton-x4pomo` deploys to snag-eta.vercel.app.
- **Build sandbox can't reach external APIs** (eBay/Serper/APNs/Resend/Supabase-from-build) — verify on the Vercel runtime, not locally.
- **Capacitor loads the remote site**, so web/UI changes go live on deploy with no rebuild; reserve iOS rebuilds for icon/plugins/config.
- **iOS build number must increment on every upload** (next is 3).
- **No auto-buy, ever** — product rule. SNAG surfaces the deal and links out; the human buys. (The "SNAGGED / Claim it" flow is the approved substitute.)
- **Model identity:** never put a model name in commits/PRs/code — chat only.
- Deploy/verify loop: edit → `npm run build` + `npm test` → push → confirm on Vercel (fetch snag-eta via the Vercel MCP; the browser can't tunnel the sandbox proxy).

## Key files
- `app/page.tsx` — the dark editorial app page (hero, scoreboard, GoldSnag, watchlist w/ hunt meters + sparklines, deals board).
- `src/components/` — DealCard, HeroDeal, GoldSnag, Ticker, SnagMark, WatchlistForm, DealFilters, SubmitButton, PushRegistrar, Sparkline, HowItWorks.
- `src/lib/store/{store,memory,supabase}.ts` · `src/lib/{push,notify,judge,match,deal}.ts` · `src/lib/sources/*`
- `app/api/cron/watch`, `app/api/register-device`, `app/api/push-test` · `app/privacy`, `app/support`
- `capacitor.config.ts` · `MOBILE.md` (iOS build runbook) · `design/AppIcon-1024.png`
