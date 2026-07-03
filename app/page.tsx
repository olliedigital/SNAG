import { checkNow, removeItem } from "@/lib/actions";
import { getStore } from "@/lib/store";
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

export default async function Page({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const { item: itemFilter = "", sort = "best" } = await searchParams;

  const store = getStore();
  await store.ensureSeeded();
  const [items, allDeals] = await Promise.all([store.getItems(), store.getDeals()]);
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
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <span className="mr-2">👟</span>
                  <span className="font-medium">{it.title}</span>
                  {typeof it.maxPrice === "number" && (
                    <span className="ml-2 text-xs text-neutral-500">under ${it.maxPrice}</span>
                  )}
                </div>
                <form action={removeItem}>
                  <input type="hidden" name="id" value={it.id} />
                  <button className="text-xs text-neutral-500 transition hover:text-red-400">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Nothing yet — add your first sneaker above.</p>
        )}
      </section>

      <section className="space-y-4">
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
        {deals.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <DealCard key={d.alert.id} deal={d} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
            {itemFilter
              ? "No deals for this shoe yet — SNAG checks every hour."
              : "No deals surfaced yet. SNAG checks every hour, or click “Check for deals now.”"}
          </p>
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
