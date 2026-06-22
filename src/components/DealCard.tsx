import type { Deal } from "@/lib/store";

const categoryIcon: Record<string, string> = { sneakers: "👟", games: "🎮" };

export function DealCard({ deal }: { deal: Deal }) {
  const { alert, listing, item } = deal;
  const pct = alert.dealScore ? Math.round(alert.dealScore * 100) : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{categoryIcon[item.category] ?? "🔎"}</span>
            <span className="truncate capitalize">{listing.sourceKey.replace(/_/g, " ")}</span>
            {listing.condition && (
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 capitalize">{listing.condition}</span>
            )}
          </div>
          <h3 className="mt-1 truncate font-medium text-neutral-100">{listing.title}</h3>
        </div>
        {pct !== null && pct > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
            {pct}% under
          </span>
        )}
      </div>

      <div className="text-2xl font-semibold">${listing.price.toFixed(2)}</div>

      <p className="text-sm text-neutral-400">{alert.reason}</p>

      <a
        href={listing.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400"
      >
        View listing →
      </a>
    </article>
  );
}
