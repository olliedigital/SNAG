import { checkNow, removeItem } from "@/lib/actions";
import { getStore, type MarketOffer } from "@/lib/store";
import { usingEbay, usingScout } from "@/lib/sources/active";
import { DealCard } from "@/components/DealCard";
import { DealFilters } from "@/components/DealFilters";
import { SubmitButton } from "@/components/SubmitButton";
import { WatchlistForm } from "@/components/WatchlistForm";

export const dynamic = "force-dynamic";

interface PageSearchParams {
  item?: string;
  sort?: string;
}

// Lowest tracked price per store — the whole market at a glance, deals or not.
function MarketStrip({ offers }: { offers: MarketOffer[] }) {
  if (offers.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">Across the market:</span>
      {offers.map((o) => (
        <a
          key={o.store}
          href={o.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 transition hover:border-emerald-500/50"
        >
          <span className="capitalize">{o.store}</span>{" "}
          <span className="font-semibold text-emerald-300">${o.price.toFixed(0)}</span>
        </a>
      ))}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const { item: itemFilter = "", sort = "best" } = await searchParams;

  const store = getStore();
  await store.ensureSeeded();
  const [items, allDeals, priceStats, market] = await Promise.all([
    store.getItems(),
    store.getDeals(),
    store.getItemPriceStats(),
    store.getMarketSnapshot(),
  ]);
  const ebay = usingEbay();

  const deals = [...(itemFilter ? allDeals.filter((d) => d.item.id === itemFilter) : allDeals)];
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

  // Spotlight the single best deal when sorted by "best"; group the remainder
  // per shoe in the all-shoes view so different watches never interleave.
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
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SNAG<span className="text-emerald-400">.</span>
          </h1>
          <p className="text-sm text-neutral-400">
            Watches for the sneakers you want — and flags the best deals.
          </p>
        </div>
        <form action={checkNow}>
          <SubmitButton>Check for deals now</SubmitButton>
        </form>
      </header>

      <section className="mb-10 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Your watchlist</h2>
        <WatchlistForm />
        {items.length > 0 ? (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {items.map((it) => {
              const s = priceStats[it.id];
              return (
                <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <span className="mr-2">👟</span>
                    <span className="font-medium">{it.title}</span>
                    {typeof it.maxPrice === "number" && (
                      <span className="ml-2 text-xs text-neutral-500">under ${it.maxPrice}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {s && s.count >= 3 && (
                      <span className="hidden text-xs text-neutral-500 sm:inline">
                        typical <span className="text-neutral-300">${s.median.toFixed(0)}</span> · {s.count} listings
                      </span>
                    )}
                    <form action={removeItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-xs text-neutral-500 transition hover:text-red-400">Remove</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Nothing yet — add your first sneaker above.</p>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Deals found ({deals.length})
          </h2>
          <DealFilters
            items={items.map((it) => ({ id: it.id, title: it.title }))}
            currentItem={itemFilter}
            currentSort={sort}
          />
        </div>

        {itemFilter && market[itemFilter] && <MarketStrip offers={market[itemFilter]} />}

        {deals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
            {itemFilter
              ? "No deals for this shoe yet — SNAG checks every hour."
              : "No deals surfaced yet. SNAG checks every hour, or click “Check for deals now.”"}
          </p>
        ) : (
          <>
            {hero && <DealCard deal={hero} stats={priceStats[hero.item.id]} showItem={!itemFilter} hero />}

            {grouped ? (
              grouped.map((g) => (
                <div key={g.item.id} className="space-y-3 pt-2">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-semibold text-neutral-200">👟 {g.item.title}</h3>
                    <span className="text-xs text-neutral-500">
                      {g.deals.length} deal{g.deals.length > 1 ? "s" : ""}
                      {priceStats[g.item.id] ? ` · typical $${priceStats[g.item.id].median.toFixed(0)}` : ""}
                    </span>
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

      <footer className="mt-12 border-t border-neutral-900 pt-4 text-xs text-neutral-600">
        {ebay
          ? `Live sneaker listings from eBay${usingScout() ? " + web-wide price scout (StockX, GOAT & more via the shopping index)" : ""}. AI-verified matches. Hunting hourly.`
          : "Demo mode — add your eBay developer key to pull live listings."}
      </footer>
    </main>
  );
}
