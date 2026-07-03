import type { Deal, PriceStats } from "@/lib/store";

// Visual tier by how far under market the deal is. A strike hit (the user's
// own target price) outranks everything and goes gold.
function tierOf(score: number | undefined, isStrike: boolean) {
  const pct = score ? Math.round(score * 100) : 0;
  if (isStrike)
    return {
      pct,
      label: "🎯 Strike hit",
      badge: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
      card: "border-amber-300 ring-1 ring-amber-200 shadow-[0_12px_40px_-12px_rgba(245,158,11,0.35)]",
    };
  if (pct >= 35)
    return {
      pct,
      label: `🔥 ${pct}% under`,
      badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
      card: "border-emerald-300 shadow-[0_12px_40px_-14px_rgba(16,185,129,0.35)]",
    };
  if (pct >= 20)
    return { pct, label: `${pct}% under`, badge: "bg-emerald-50 text-emerald-700", card: "border-stone-200" };
  if (pct > 0)
    return { pct, label: `${pct}% under`, badge: "bg-stone-100 text-stone-600", card: "border-stone-200" };
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
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-400/80 via-stone-200 to-rose-300/70">
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-stone-400" style={{ left: `${med}%` }} />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-2 ring-white"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400">
        <span>${stats.min.toFixed(0)}</span>
        <span className="text-stone-500">typical ${stats.median.toFixed(0)}</span>
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
  const isStrike = alert.basis === "max_price";
  const tier = tierOf(alert.dealScore, isStrike);

  const image = (
    <div
      className={`flex items-center justify-center overflow-hidden bg-stone-50 ${
        hero ? "h-52 sm:h-auto sm:w-64 sm:shrink-0" : "h-40"
      }`}
    >
      {listing.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-contain p-3" loading="lazy" />
      ) : (
        <span className="text-4xl opacity-30">👟</span>
      )}
    </div>
  );

  const body = (
    <div className={`flex flex-1 flex-col gap-2.5 p-4 ${hero ? "sm:p-6" : ""}`}>
      {hero && (
        <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">🏆 Best snag right now</div>
      )}
      {isStrike && (
        <div className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
          🎯 Snagged — your price hit!
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 capitalize">
          {listing.seller ?? listing.sourceKey.replace(/_/g, " ")}
        </span>
        {listing.condition && (
          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 capitalize">{listing.condition}</span>
        )}
        <span className="ml-auto text-[11px] text-stone-400">{timeAgo(alert.createdAt)}</span>
      </div>
      {showItem && <div className="text-[11px] text-stone-400">for: {item.title}</div>}
      <h3 className={`line-clamp-2 font-medium leading-snug text-stone-900 ${hero ? "text-lg" : "text-sm"}`}>
        {listing.title}
      </h3>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-bold text-stone-900 ${hero ? "text-4xl" : "text-2xl"}`}>
          ${listing.price.toFixed(2)}
        </span>
        {tier && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tier.badge}`}>{tier.label}</span>}
      </div>
      {stats && <PriceBar price={listing.price} stats={stats} />}
      <p className="line-clamp-2 text-xs text-stone-500">{alert.reason}</p>
      <a
        href={listing.url}
        target="_blank"
        rel="noreferrer"
        className={`mt-auto inline-flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm transition ${
          isStrike ? "bg-amber-500 hover:bg-amber-400" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {isStrike ? "Claim it →" : "View listing →"}
      </a>
    </div>
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${tier?.card ?? "border-stone-200"} ${
        hero ? "flex flex-col sm:flex-row ring-1 ring-emerald-300" : "flex flex-col"
      }`}
    >
      {image}
      {body}
    </article>
  );
}
