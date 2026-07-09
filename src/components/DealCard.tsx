import type { Deal, PriceStats } from "@/lib/store";
import { dealHeat, flames } from "@/lib/heat";
import { SnagMark } from "@/components/SnagMark";

const clamp = (n: number) => Math.max(2, Math.min(98, n));

// Where this price sits between the cheapest and priciest listing seen for the
// shoe. Green fill to the price, a bone tick at the typical (median).
function PositionBar({ price, stats }: { price: number; stats: PriceStats }) {
  if (stats.count < 3 || stats.max <= stats.min) return null;
  const span = stats.max - stats.min;
  const pos = clamp(((price - stats.min) / span) * 100);
  const tick = clamp(((stats.median - stats.min) / span) * 100);
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      <div className="relative h-[5px] rounded-full bg-bone/10">
        <div className="absolute inset-y-0 left-0 rounded-full bg-live" style={{ width: `${pos}%` }} />
        <div className="absolute top-[-3px] h-[11px] w-0.5 rounded-[1px] bg-bone" style={{ left: `${tick}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-semibold tracking-[0.04em] text-bone/38">
        <span>${stats.min.toFixed(0)} low</span>
        <span>typical</span>
        <span>${stats.max.toFixed(0)} high</span>
      </div>
    </div>
  );
}

// The whole card is the link — tap anywhere to open the listing. The CTA at the
// bottom is a visual affordance, not a separate (illegal nested) link.
export function DealCard({ deal, stats, showItem = false }: { deal: Deal; stats?: PriceStats; showItem?: boolean }) {
  const { alert, listing, item } = deal;
  const isStrike = alert.basis === "max_price";
  const pct = alert.dealScore ? Math.round(alert.dealScore * 100) : 0;
  const store = listing.seller ?? listing.sourceKey.replace(/_/g, " ");
  const meta = [store, listing.condition].filter(Boolean).join(" · ");
  const heat = dealHeat(listing.price, alert.createdAt, pct, stats);

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noreferrer"
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-sm border bg-surface transition duration-150 hover:-translate-y-[3px] ${
        isStrike ? "border-gold/60 hover:border-gold" : "border-bone/12 hover:border-bone/35"
      }`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-bone">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-contain p-4" loading="lazy" />
        ) : (
          <SnagMark className="h-10 w-10 text-ink/20" />
        )}
        {isStrike ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-gold px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-gold-ink">
            <SnagMark className="h-3 w-3 text-gold-ink" /> Strike hit
          </span>
        ) : (
          pct > 0 && (
            <span className="absolute left-3 top-3 rounded-sm bg-live px-2.5 py-1 font-display text-[13px] font-extrabold tracking-[0.01em] text-live-ink">
              −{pct}%
            </span>
          )
        )}
        {heat.chip && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-ink/85 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-bone backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full animate-snagpulse"
              style={{ background: heat.chip.tone === "gold" ? "#f0c94a" : "#22c55e" }}
            />
            {heat.chip.text}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[11px] p-[18px] pb-5">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-bone/40">{meta || "listing"}</span>
        {showItem && <span className="-mt-1.5 text-[11px] text-bone/35">for: {item.title}</span>}
        <p className="line-clamp-2 min-h-[38px] font-sans text-[13px] leading-[1.45] text-bone/62">{listing.title}</p>

        <div className="flex items-baseline gap-2.5">
          <span className={`font-display text-[40px] font-extrabold leading-[0.85] tracking-[-0.03em] ${isStrike ? "text-gold" : "text-bone"}`}>
            ${listing.price.toFixed(0)}
          </span>
          {alert.referencePrice && alert.referencePrice > listing.price && (
            <span className="font-sans text-[13px] text-bone/40">
              typical <s>${alert.referencePrice.toFixed(0)}</s>
            </span>
          )}
        </div>

        {stats && <PositionBar price={listing.price} stats={stats} />}

        <p className="flex-1 font-sans text-[12.5px] leading-[1.5] text-bone/60">{alert.reason}</p>

        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] text-bone/40">{heat.scarcity}</span>
          {heat.level >= 2 && (
            <span className={`whitespace-nowrap font-sans text-[11px] font-bold ${isStrike ? "text-gold" : "text-live"}`}>
              {flames(heat.level)} {heat.levelLabel}
            </span>
          )}
        </div>

        <span
          className={`flex h-[46px] items-center justify-center rounded-sm font-sans text-sm font-bold tracking-[0.02em] transition ${
            isStrike ? "bg-gold text-gold-ink group-hover:bg-gold-light" : "bg-bone text-ink group-hover:bg-live"
          }`}
        >
          {isStrike ? "Claim it →" : "View listing →"}
        </span>
      </div>
    </a>
  );
}
