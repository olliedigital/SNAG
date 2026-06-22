import { checkNow, removeItem } from "@/lib/actions";
import { db } from "@/lib/store/memory";
import { DealCard } from "@/components/DealCard";
import { SubmitButton } from "@/components/SubmitButton";
import { WatchlistForm } from "@/components/WatchlistForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  await db.ensureSeeded();
  const items = db.items;
  const deals = db.getDeals();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SNAG<span className="text-emerald-400">.</span>
          </h1>
          <p className="text-sm text-neutral-400">
            Watches for the sneakers and games you want — and flags the good deals.
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
                  <span className="mr-2">{it.category === "sneakers" ? "👟" : "🎮"}</span>
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
          <p className="text-sm text-neutral-500">Nothing yet — add your first item above.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Deals found ({deals.length})
        </h2>
        {deals.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <DealCard key={d.alert.id} deal={d} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
            No deals surfaced yet. Click “Check for deals now”.
          </p>
        )}
      </section>

      <footer className="mt-12 border-t border-neutral-900 pt-4 text-xs text-neutral-600">
        Demo data — SNAG is running the real watch → match → deal pipeline against two mock “stores”.
        Live sites (eBay, Best Buy) drop in next.
      </footer>
    </main>
  );
}
