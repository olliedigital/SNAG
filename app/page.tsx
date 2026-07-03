import { checkNow, removeItem, setStrike } from "@/lib/actions";
import { getStore, type MarketOffer, type PriceStats } from "@/lib/store";
import { usingEbay, usingScout } from "@/lib/sources/active";
import { DealCard } from "@/components/DealCard";
import { DealFilters } from "@/components/DealFilters";
import { SubmitButton } from "@/components/SubmitButton";
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

// Lowest tracked price per store — the whole market at a glance, deals or not.
function MarketStrip({ offers }: { offers: MarketOffer[] }) {
  if (offers.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-stone-400">Across the market:</span>
      {offers.map((o) => (
        <a
          key={o.store}
          href={o.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 shadow-sm transition hover:border-emerald-400"
        >
          <span className="capitalize">{o.store}</span>{" "}
          <span className="font-semibold text-emerald-700">${o.price.toFixed(0)}</span>
        </a>
      ))}
    </div>
  );
}

// How close the market is to the user's strike price — the game meter.
function HuntMeter({ strike, stats }: { strike?: number; stats?: PriceStats }) {
  if (!strike || !stats || stats.count < 1) return null;
  const hit = stats.min <= strike;
  const progress = hit ? 100 : Math.max(4, Math.min(100, Math.round((strike / stats.min) * 100)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-36 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full ${hit ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-xs ${hit ? "font-semibold text-amber-600" : "text-stone-500"}`}>
        {hit ? "🎯 strike hit!" : `best $${stats.min.toFixed(0)} → strike $${strike.toFixed(0)}`}
      </span>
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
  const hero =
    isBestSort && deals.length > 0
      ? deals.reduce((a, b) => ((b.alert.dealScore ?? 0) > (a.alert.dealScore ?? 0) ? b : a))
      : null;
  const rest = hero ? deals.filter((d) => d.alert.id !== hero.alert.id) : deals;
  const grouped =
    isBestSort && !itemFilter
      ? items
          .map((it) => ({ item: it, deals: rest.filter((d) => d.item.id === it.id) }))
          .filter((g) => g.deals.length > 0)
      : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            SNAG<span className="text-emerald-600">.</span>
          </h1>
          <p className="text-sm text-stone-500">Watches for the sneakers you want — and flags the best deals.</p>
        </div>
        <form action={checkNow}>
          <SubmitButton>Check for deals now</SubmitButton>
        </form>
      </header>

      <div className="mb-10 flex flex-wrap gap-6 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <div className="text-2xl font-bold text-stone-900">{listingsTracked}</div>
          <div className="text-xs uppercase tracking-wide text-stone-400">listings tracked</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-stone-900">{allDeals.length}</div>
          <div className="text-xs uppercase tracking-wide text-stone-400">deals found</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-600">${potentialSavings.toFixed(0)}</div>
          <div className="text-xs uppercase tracking-wide text-stone-400">potential savings spotted</div>
        </div>
        <div className="ml-auto self-center text-right text-xs text-stone-400">
          hunting 24/7,
          <br />
          every hour
        </div>
      </div>

      <section className="mb-10 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Your watchlist</h2>
        <WatchlistForm />
        {items.length > 0 ? (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
            {items.map((it) => {
              const s = priceStats[it.id];
              return (
                <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <span className="mr-2">👟</span>
                    <span className="font-medium">{it.title}</span>
                    {s && s.count >= 3 && (
                      <span className="ml-2 hidden text-xs text-stone-400 sm:inline">
                        typical <span className="text-stone-600">${s.median.toFixed(0)}</span> · {s.count} tracked
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <HuntMeter strike={it.maxPrice} stats={s} />
                    <form action={setStrike} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={it.id} />
                      <input
                        name="strike"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={it.maxPrice ?? ""}
                        placeholder="🎯 strike $"
                        className="w-24 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1 text-xs text-stone-700 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
                      />
                      <button className="text-xs font-medium text-stone-500 transition hover:text-amber-600">Set</button>
                    </form>
                    <form action={removeItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-xs text-stone-400 transition hover:text-red-500">Remove</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Nothing yet — add your first sneaker above.</p>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Deals found ({deals.length})
          </h2>
          <DealFilters
            items={items.map((it) => ({ id: it.id, title: it.title }))}
            currentItem={itemFilter}
            currentSort={sort}
            currentCond={cond}
          />
        </div>

        {itemFilter && market[itemFilter] && <MarketStrip offers={market[itemFilter]} />}

        {deals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
            {cond !== "any"
              ? `No ${cond === "new" ? "brand-new" : "used"} deals right now — try “Any condition.”`
              : itemFilter
                ? "No deals for this shoe yet — SNAG checks every hour."
                : "No deals surfaced yet. SNAG checks every hour, or click “Check for deals now.”"}
          </p>
        ) : (
          <>
            {hero && <DealCard deal={hero} stats={priceStats[hero.item.id]} showItem={!itemFilter} hero />}

            {grouped ? (
              grouped.map((g) => (
                <div key={g.item.id} className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="font-semibold text-stone-800">👟 {g.item.title}</h3>
                    <span className="text-xs text-stone-400">
                      {g.deals.length} deal{g.deals.length > 1 ? "s" : ""}
                      {priceStats[g.item.id] ? ` · typical $${priceStats[g.item.id].median.toFixed(0)}` : ""}
                    </span>
                    <HuntMeter strike={g.item.maxPrice} stats={priceStats[g.item.id]} />
                  </div>
                  {market[g.item.id] && <MarketStrip offers={market[g.item.id]} />}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.deals.map((d) => (
                      <DealCard key={d.alert.id} deal={d} stats={priceStats[d.item.id]} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((d) => (
                  <DealCard key={d.alert.id} deal={d} stats={priceStats[d.item.id]} showItem={!itemFilter} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="mt-12 border-t border-stone-200 pt-4 text-xs text-stone-400">
        {ebay
          ? `Live sneaker listings from eBay${usingScout() ? " + web-wide price scout (StockX, GOAT & more via the shopping index)" : ""}. AI-verified matches. Hunting hourly.`
          : "Demo mode — add your eBay developer key to pull live listings."}
      </footer>
    </main>
  );
}
