// Scrolling headline strip. Two identical runs so the -50% marquee loops
// seamlessly. Pure CSS animation — no client JS.
export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const run = items.join("  •  ") + "  •  ";
  return (
    <div className="overflow-hidden border-b border-bone/10 py-2">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="pr-14 text-[11px] font-semibold tracking-[0.24em] text-bone/45"
            aria-hidden={i === 1}
          >
            {run}
          </span>
        ))}
      </div>
    </div>
  );
}
