import type { Deal, PriceStats } from "@/lib/store";

// Visual tier by how far under market the deal is.
function tierOf(score?: number) {
  const pct = score ? Math.round(score * 100) : 0;
  if (pct >= 35)
    return {
      pct,
      label: `🔥 ${pct}% under`,
      badge: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/50",
      card: "border-emerald-500/50 shadow-[0_0_36px_-10px_rgba(52,211,153,0.35)]",
    };
  if (pct >= 20)
    return {
      pct,
      label: `${pct}% under`,
      badge: "bg-emerald-500/15 text-emerald-300",
      card: "border-neutral-800",
    };
  if (pct > 0)
    return { pct, label: `${pct}% under`, badge: "bg-neutral-800 text-neutral-300", card: "border-neutral-800" };
  return null;
}

function timeAgo(ts: number): string {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const clamp = (n: number) => Math.max(2, Math.min(98, n));

// Where this price sits between the cheapest and priciest listing seen for the
// shoe — the "is this actually a deal?" bar.
function PriceBar({ price, stats }: { price: number; stats: PriceStats }) {
  if (stats.count < 3 || stats.max <= stats.min) return null;
  const span = stats.max - stats.min;
  const pos = clamp(((price - stats.min) / span) * 100);
  const med = clamp(((stats.median - stats.min) / span) * 100);
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-500/70 via-neutral-700 to-rose-400/50">
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-neutral-400/70" style={{ left: `${med}%` }} />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 ring-2 ring-neutral-950"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
        <span>${stats.min.toFixed(0)}</span>
        <span className="text-neutral-400">typical ${stats.median.toFixed(0)}</span>
        <span>${stats.max.toFixed(0)}</span>
      </div>
    </div>
  );
}

export function DealCard({
  deal,
  stats,
  showItem = false,
  hero = false,
}: {
  deal: Deal;
  stats?: PriceStats;
  showItem?: boolean;
  hero?: boolean;
}) {
  const { alert, listing, item } = deal;
  const tier = tierOf(alert.dealScore);

  const image = (
    <div className={`flex items-center justify-center overflow-hidden bg-neutral-950 ${hero ? "h-52 sm:h-auto sm:w-64 sm:shrink-0" : "h-40"}`}>
      {listing.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-contain p-3" loading="lazy" />
      ) : (
        <span className="text-4xl opacity-40">👟</span>
      )}
    </div>
  );

  const body = (
    <div className={`flex flex-1 flex-col gap-2.5 p-4 ${hero ? "sm:p-6" : ""}`}>
      {hero && (
        <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">🏆 Best snag right now</div>
      )}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span className="rounded bg-neutral-800 px-1.5 py-0.5 capitalize">
          {listing.seller ?? listing.sourceKey.replace(/_/g, " ")}
        </span>
        {listing.condition && <span className="rounded bg-neutral-800 px-1.5 py-0.5 capitalize">{listing.condition}</span>}
        <span className="ml-auto text-[11px] text-neutral-500">{timeAgo(alert.createdAt)}</span>
      </div>
      {showItem && <div className="text-[11px] text-neutral-500">for: {item.title}</div>}
      <h3 className={`line-clamp-2 font-medium leading-snug text-neutral-100 ${hero ? "text-lg" : "text-sm"}`}>
        {listing.title}
      </h3>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-bold ${hero ? "text-4xl" : "text-2xl"}`}>${listing.price.toFixed(2)}</span>
        {tier && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tier.badge}`}>{tier.label}</span>}
      </div>
      {stats && <PriceBar price={listing.price} stats={stats} />}
      <p className="line-clamp-2 text-xs text-neutral-400">{alert.reason}</p>
      <a
        href={listing.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
      >
        View listing →
      </a>
    </div>
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-neutral-900 ${tier?.card ?? "border-neutral-800"} ${
        hero ? "flex flex-col sm:flex-row ring-1 ring-emerald-500/30" : "flex flex-col"
      }`}
    >
      {image}
      {body}
    </article>
  );
}
