import type { Deal } from "@/lib/store";
import { SnagMark } from "@/components/SnagMark";

function timeAgo(ts: number): string {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// The win. Shown when a listing lands at or under the user's strike price —
// gold gradient, claim CTA. gold-ink is rgb(26,20,5), so /opacity gives the
// design's brown text tints.
export function GoldSnag({ deal }: { deal: Deal }) {
  const { alert, listing, item } = deal;
  const strike = item.maxPrice;
  const under = strike ? Math.max(0, strike - listing.price) : 0;
  const store = listing.seller ?? listing.sourceKey.replace(/_/g, " ");

  return (
    <div className="relative overflow-hidden rounded-sm bg-[radial-gradient(120%_140%_at_15%_0%,#fbe9a8_0%,#f0c94a_42%,#d69e1a_100%)] text-gold-ink">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[52%] bg-gradient-to-r from-transparent to-white/28" />
      <div className="relative flex flex-wrap items-center gap-9 p-8 sm:px-10 sm:py-9">
        <div className="flex min-w-[280px] flex-[1.4] flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-[7px] font-sans text-xs font-bold uppercase tracking-[0.24em]">
              <SnagMark className="h-3.5 w-3.5 text-gold-ink" /> Snagged
            </span>
            <span className="h-px flex-1 bg-gold-ink/30" />
            <span className="whitespace-nowrap font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-ink/60">
              {strike ? `Strike $${strike.toFixed(0)} hit · ` : ""}
              {timeAgo(alert.createdAt)}
            </span>
          </div>

          <h2 className="font-display text-[clamp(34px,5vw,60px)] font-black uppercase leading-[0.92] tracking-[-0.02em]">
            {item.title}
          </h2>

          <div className="flex flex-wrap items-baseline gap-4">
            <span className="font-display text-[clamp(52px,8vw,76px)] font-extrabold leading-[0.85] tracking-[-0.03em]">
              ${listing.price.toFixed(0)}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="line-clamp-1 max-w-[320px] font-sans text-sm font-bold">{listing.title}</span>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-gold-ink/65">
                {store}
                {listing.condition ? ` · ${listing.condition}` : ""}
                {under > 0 ? ` · $${under.toFixed(0)} under your strike` : ""}
              </span>
            </div>
          </div>

          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex h-[54px] items-center self-start rounded-sm bg-gold-ink px-[34px] font-sans text-[15px] font-bold tracking-[0.06em] text-gold transition hover:bg-black"
          >
            Claim it now →
          </a>
        </div>

        <div className="flex h-[190px] w-[190px] flex-none items-center justify-center overflow-hidden rounded-sm bg-white shadow-[0_20px_50px_rgba(26,20,5,.28)]">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-contain p-3" loading="lazy" />
          ) : (
            <SnagMark className="h-12 w-12 text-gold-ink/30" />
          )}
        </div>
      </div>
    </div>
  );
}
