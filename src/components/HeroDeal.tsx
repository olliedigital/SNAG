import type { Deal, PriceStats } from "@/lib/store";
import { SnagMark } from "@/components/SnagMark";

// The single best deal on the board — a wide editorial split: image plate on
// the left, the pitch on the right.
export function HeroDeal({ deal, stats }: { deal: Deal; stats?: PriceStats }) {
  const { alert, listing, item } = deal;
  const pct = alert.dealScore ? Math.round(alert.dealScore * 100) : 0;
  const store = listing.seller ?? listing.sourceKey.replace(/_/g, " ");
  const storeCond = [store, listing.condition].filter(Boolean).join(" · ");
  const typical = alert.referencePrice ?? stats?.median;

  return (
    <div className="relative flex flex-wrap overflow-hidden rounded-sm border border-bone/12 bg-surface">
      <div className="relative flex min-h-[300px] min-w-[280px] flex-1 items-center justify-center bg-bone">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-contain p-6" loading="lazy" />
        ) : (
          <SnagMark className="h-14 w-14 text-ink/20" />
        )}
        <span className="absolute left-5 top-5 inline-flex items-center gap-[7px] rounded-sm bg-ink px-3 py-[7px] font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-bone">
          <SnagMark className="h-3.5 w-3.5 text-live" /> Best snag now
        </span>
      </div>

      <div className="flex flex-[1.3] flex-col justify-center gap-4 p-8 sm:px-[34px] sm:py-9" style={{ minWidth: "300px" }}>
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-live">−{pct}% under market</span>
          <span className="h-px flex-1 bg-bone/12" />
        </div>
        <h3 className="font-display text-[clamp(30px,4vw,46px)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
          {item.title}
        </h3>
        <p className="line-clamp-2 max-w-[440px] font-sans text-[13px] leading-[1.5] text-bone/45">{listing.title}</p>
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="font-display text-[clamp(48px,7vw,66px)] font-extrabold leading-[0.85] tracking-[-0.03em] text-live">
            ${listing.price.toFixed(0)}
          </span>
          <span className="font-sans text-sm text-bone/45">
            {typical && typical > listing.price ? (
              <>
                typical <s>${typical.toFixed(0)}</s> ·{" "}
              </>
            ) : null}
            {storeCond}
          </span>
        </div>
        <p className="max-w-[440px] font-sans text-[14.5px] leading-[1.5] text-bone/70">{alert.reason}</p>
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 flex h-[52px] items-center self-start rounded-sm bg-bone px-[30px] font-sans text-[15px] font-bold tracking-[0.02em] text-ink transition hover:bg-live"
        >
          Snag it →
        </a>
      </div>
    </div>
  );
}
