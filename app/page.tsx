import { checkNow, removeItem, setStrike } from "@/lib/actions";
import { getStore, type Deal, type MarketOffer, type PriceStats } from "@/lib/store";
import { usingEbay, usingScout } from "@/lib/sources/active";
import { DealCard } from "@/components/DealCard";
import { DealFilters } from "@/components/DealFilters";
import { GoldSnag } from "@/components/GoldSnag";
import { HeroDeal } from "@/components/HeroDeal";
import { SnagMark } from "@/components/SnagMark";
import { SubmitButton } from "@/components/SubmitButton";
import { Ticker } from "@/components/Ticker";
import { WatchlistForm } from "@/components/WatchlistForm";

export const dynamic = "force-dynamic";

interface PageSearchParams {
  item?: string;
  sort?: string;
  cond?: string;
}

// "New"/"New with box" -> new; "Pre-owned"/"Used"/"Worn" -> used; unlabeled -> unknown.
function conditionBucket(c?: string): "new" | "used" | "unknown" {
  if (!c) return "unknown";
  const s = c.toLowerCase();
  if (s.includes("pre-owned") || s.includes("used") || s.includes("worn") || s.includes("refurb")) return "used";
  if (s.includes("new")) return "new";
  return "unknown";
}

function shortAgo(ts: number): string {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const GENDER_LABEL: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" };

// How close the market is to the user's strike — the row's hunt meter.
function watchMeter(strike: number | undefined, s: PriceStats | undefined) {
  if (strike && s && s.count >= 1) {
    const hit = s.min <= strike;
    return {
      pct: hit ? 100 : Math.max(6, Math.min(100, Math.round((strike / s.min) * 100))),
      fill: hit ? "bg-gold" : "bg-live",
      status: hit
        ? "Strike hit — claim it before it's gone."
        : `Best right now $${s.min.toFixed(0)} · typical $${s.median.toFixed(0)}`,
      label: hit ? "STRIKE HIT" : `$${s.min.toFixed(0)} → $${strike.toFixed(0)}`,
      labelColor: hit ? "text-gold" : "text-live",
    };
  }
  if (strike) {
    return {
      pct: 5,
      fill: "bg-bone/25",
      status: "Armed — hunting for listings.",
      label: `STRIKE $${strike.toFixed(0)}`,
      labelColor: "text-bone/45",
    };
  }
  if (s && s.count >= 1) {
    return {
      pct: 0,
      fill: "bg-bone/20",
      status: `Best right now $${s.min.toFixed(0)} · typical $${s.median.toFixed(0)}`,
      label: "SET A STRIKE",
      labelColor: "text-bone/45",
    };
  }
  return { pct: 0, fill: "bg-bone/20", status: "Hunting — no listings priced yet.", label: "WATCHING", labelColor: "text-bone/45" };
}

// The "across the market" chips: lowest tracked price per store.
function MarketChips({ offers }: { offers: MarketOffer[] }) {
  if (offers.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-bone/35">Across the market</span>
      {offers.map((o) => (
        <a
          key={o.store}
          href={o.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-bone/16 px-2.5 py-1 font-sans text-xs font-semibold text-bone/75 transition hover:border-bone/40"
        >
          <span className="capitalize text-bone/45">{o.store}</span> ${o.price.toFixed(0)}
        </a>
      ))}
    </div>
  );
}

function SectionHeader({ n, title, trailing }: { n: string; title: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/14 pb-4">
      <div className="flex flex-wrap items-baseline gap-3.5">
        <span className="font-sans text-xs font-semibold tracking-[0.2em] text-bone/35">{n}</span>
        <h2 className="font-display text-3xl font-extrabold uppercase tracking-[-0.01em]">{title}</h2>
        {trailing}
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const { item: itemFilter = "", sort = "best", cond = "any" } = await searchParams;

  const store = getStore();
  await store.ensureSeeded();
  const [items, allDeals, priceStats, market] = await Promise.all([
    store.getItems(),
    store.getDeals(),
    store.getItemPriceStats(),
    store.getMarketSnapshot(),
  ]);
  const ebay = usingEbay();

  const listingsTracked = Object.values(priceStats).reduce((s, p) => s + p.count, 0);
  const potentialSavings = allDeals.reduce(
    (s, d) => s + Math.max(0, (d.alert.referencePrice ?? d.listing.price) - d.listing.price),
    0,
  );
  const lastSnag = allDeals.length > 0 ? Math.max(...allDeals.map((d) => d.alert.createdAt)) : null;

  // The win banner: best deal that hit the user's strike price.
  const snagged = allDeals.find((d) => d.alert.basis === "max_price");

  // Ticker headlines from the real board.
  const tickerItems: string[] = [];
  for (const d of allDeals.slice(0, 6)) {
    const pct = d.alert.dealScore ? Math.round(d.alert.dealScore * 100) : 0;
    const st = (d.listing.seller ?? d.listing.sourceKey).toUpperCase();
    if (d.alert.basis === "max_price") tickerItems.push(`${d.item.title} — strike hit`);
    else if (pct > 0) tickerItems.push(`${d.item.title} −${pct}% ${st}`);
  }
  tickerItems.push(`${listingsTracked} listings under watch`, "The agent never sleeps");

  // --- Deals board: filter, sort, group ---
  let deals = [...(itemFilter ? allDeals.filter((d) => d.item.id === itemFilter) : allDeals)];
  if (cond === "new" || cond === "used") {
    deals = deals.filter((d) => conditionBucket(d.listing.condition) === cond);
  }
  switch (sort) {
    case "price_asc":
      deals.sort((a, b) => a.listing.price - b.listing.price);
      break;
    case "price_desc":
      deals.sort((a, b) => b.listing.price - a.listing.price);
      break;
    case "newest":
      deals.sort((a, b) => b.alert.createdAt - a.alert.createdAt);
      break;
    case "oldest":
      deals.sort((a, b) => a.alert.createdAt - b.alert.createdAt);
      break;
    default:
      break; // "best": already sorted by deal score
  }

  const isBestSort = sort === "best";
  // Hero showcases the biggest discount; strike wins live in the gold banner.
  const hero: Deal | null =
    isBestSort && deals.length > 0 ? (deals.find((d) => d.alert.basis !== "max_price") ?? deals[0]) : null;
  const rest = hero ? deals.filter((d) => d.alert.id !== hero.alert.id) : deals;
  const grouped =
    isBestSort && !itemFilter
      ? items
          .map((it) => ({ item: it, deals: rest.filter((d) => d.item.id === it.id) }))
          .filter((g) => g.deals.length > 0)
      : null;

  return (
    <>
      <Ticker items={tickerItems} />

      {/* nav */}
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-[22px] sm:px-7">
        <div className="flex shrink-0 items-center gap-2.5">
          <SnagMark className="h-8 w-8 text-live" pulse glow />
          <span className="font-display text-[26px] font-extrabold leading-none tracking-[-0.01em]">SNAG</span>
        </div>
        <span className="flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-bone/50">
          <span className="h-1.5 w-1.5 shrink-0 animate-snagpulse rounded-full bg-live" />
          Hunting
          <span className="hidden sm:inline">· {lastSnag ? `last snag ${shortAgo(lastSnag)}` : "sweeps every hour"}</span>
        </span>
      </nav>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-20 px-5 pb-24 sm:px-7">
        {/* hero / headline */}
        <header className="flex flex-col gap-9 pt-5">
          <div className="flex flex-col gap-[18px]">
            <span className="font-sans text-xs font-semibold tracking-[0.28em] text-live">YOUR PERSONAL DEAL AGENT</span>
            <h1 className="font-display text-[clamp(52px,9vw,124px)] font-black uppercase leading-[0.9] tracking-[-0.02em]">
              Hunt the
              <br />
              whole market.
              <br />
              <span className="text-bone/35">Claim the W.</span>
            </h1>
            <p className="max-w-[520px] font-sans text-[17px] leading-[1.5] text-bone/60">
              SNAG watches eBay, StockX, GOAT and more — 24/7 — and pings you the second a verified pair drops below what
              it should cost.
            </p>
          </div>

          {/* scoreboard */}
          <div className="grid gap-px border border-bone/10 bg-bone/10 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {[
              { v: String(listingsTracked), l: "Listings tracked", c: "" },
              { v: String(allDeals.length), l: "Deals live now", c: "" },
              { v: `$${potentialSavings.toFixed(0)}`, l: "Potential savings", c: "text-live" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col gap-1.5 bg-ink px-7 py-[26px]">
                <span className={`font-display text-[52px] font-extrabold leading-[0.9] tracking-[-0.02em] ${s.c}`}>{s.v}</span>
                <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-bone/45">{s.l}</span>
              </div>
            ))}
          </div>
        </header>

        {snagged && <GoldSnag deal={snagged} stats={priceStats[snagged.item.id]} />}

        {/* 01 — watchlist */}
        <section className="flex flex-col gap-6">
          <SectionHeader
            n="01"
            title="Watchlist"
            trailing={<span className="font-sans text-[13px] text-bone/50">Set your strike. The agent does the rest.</span>}
          />
          <WatchlistForm />

          {items.length > 0 ? (
            <div className="flex flex-col gap-3">
              {items.map((it) => {
                const s = priceStats[it.id];
                const m = watchMeter(it.maxPrice, s);
                const spec =
                  [
                    it.attributes?.colorway,
                    it.attributes?.gender ? (GENDER_LABEL[String(it.attributes.gender)] ?? String(it.attributes.gender)) : "",
                    it.attributes?.size ? `US ${it.attributes.size}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Any spec · all listings";
                return (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center gap-6 rounded-sm border border-bone/10 bg-surface px-6 py-5 transition hover:border-bone/28"
                  >
                    <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                      <span className="font-sans text-[17px] font-bold tracking-[0.01em]">{it.title}</span>
                      <span className="font-sans text-xs font-medium text-bone/40">{spec}</span>
                    </div>

                    <div className="flex min-w-[220px] flex-[2] flex-col gap-2">
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-bone/10">
                        <div className={`absolute inset-y-0 left-0 rounded-full ${m.fill}`} style={{ width: `${m.pct}%` }} />
                      </div>
                      <div className="flex justify-between gap-2.5">
                        <span className="font-sans text-[12.5px] text-bone/55">{m.status}</span>
                        <span className={`whitespace-nowrap font-sans text-[11px] font-bold tracking-[0.1em] ${m.labelColor}`}>
                          {m.label}
                        </span>
                      </div>
                    </div>

                    <form action={setStrike} className="flex flex-none flex-col items-end gap-px">
                      <input type="hidden" name="id" value={it.id} />
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-bone/40">Strike</span>
                      <div className="flex items-baseline">
                        <span className="font-display text-lg font-bold text-bone/50">$</span>
                        <input
                          name="strike"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={it.maxPrice ?? ""}
                          placeholder="—"
                          className="w-[72px] bg-transparent text-right font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-bone focus:outline-none"
                        />
                      </div>
                      <button className="font-sans text-[10px] uppercase tracking-[0.1em] text-bone/30 transition hover:text-live">
                        set ↵
                      </button>
                    </form>

                    <form action={removeItem} className="flex-none">
                      <input type="hidden" name="id" value={it.id} />
                      <button aria-label="Remove" className="text-lg leading-none text-bone/25 transition hover:text-bone/70">
                        ×
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-sans text-sm text-bone/50">Nothing yet — put the agent on your first pair above.</p>
          )}
        </section>

        {/* 02 — deals board */}
        <section className="flex flex-col gap-7">
          <SectionHeader
            n="02"
            title="Deals Board"
            trailing={<span className="font-sans text-xs font-bold tracking-[0.06em] text-live">{deals.length} LIVE</span>}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <form action={checkNow}>
              <SubmitButton variant="ghost">↻ Sweep now</SubmitButton>
            </form>
            <DealFilters
              items={items.map((it) => ({ id: it.id, title: it.title }))}
              currentItem={itemFilter}
              currentSort={sort}
              currentCond={cond}
            />
          </div>

          {itemFilter && market[itemFilter] && <MarketChips offers={market[itemFilter]} />}

          {deals.length === 0 ? (
            <div className="rounded-sm border border-dashed border-bone/18 p-12 text-center font-sans text-[15px] text-bone/45">
              {cond !== "any"
                ? `No ${cond === "new" ? "brand-new" : "used"} deals right now. Loosen up — the agent keeps hunting either way.`
                : "Nothing matches those filters. Loosen up — the agent keeps hunting either way."}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {hero && <HeroDeal deal={hero} stats={priceStats[hero.item.id]} />}

              {grouped ? (
                grouped.map((g) => (
                  <div key={g.item.id} className="flex flex-col gap-[18px]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h3 className="font-display text-[22px] font-extrabold uppercase tracking-[-0.01em]">{g.item.title}</h3>
                        {priceStats[g.item.id] && (
                          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-bone/40">
                            {priceStats[g.item.id].count} listings · {g.deals.length} under market
                          </span>
                        )}
                      </div>
                      {market[g.item.id] && <MarketChips offers={market[g.item.id]} />}
                    </div>
                    <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
                      {g.deals.map((d) => (
                        <DealCard key={d.alert.id} deal={d} stats={priceStats[d.item.id]} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
                  {rest.map((d) => (
                    <DealCard key={d.alert.id} deal={d} stats={priceStats[d.item.id]} showItem={!itemFilter} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="border-t border-bone/10 pt-6 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-bone/30">
          {ebay
            ? `SNAG·Agent · Live from eBay${usingScout() ? " + web scout" : ""} · Verified listings only`
            : "SNAG·Agent · Demo mode · Add your eBay key for live listings"}
        </footer>
      </div>
    </>
  );
}
