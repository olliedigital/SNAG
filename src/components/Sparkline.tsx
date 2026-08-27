import type { PricePoint } from "@/lib/store";

// Best-price-over-time sparkline for a watched shoe. Down = good (green); a
// rising market shows gold. Pure SVG, no dependencies.
export function Sparkline({ points, className = "" }: { points: PricePoint[]; className?: string }) {
  if (points.length < 3) return null;
  const w = 132;
  const h = 34;
  const pad = 3;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => pad + (i / (n - 1)) * (w - 2 * pad);
  const y = (p: number) => pad + (1 - (p - min) / span) * (h - 2 * pad);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(h - pad).toFixed(1)} L${x(0).toFixed(1)},${(h - pad).toFixed(1)} Z`;

  const first = prices[0];
  const last = prices[n - 1];
  const down = last <= first;
  const pct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const days = Math.max(1, Math.round((points[n - 1].t - points[0].t) / 86_400_000));
  const color = down ? "#22c55e" : "#f0c94a";
  const gid = down ? "spark-down" : "spark-up";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(n - 1)} cy={y(last)} r="2.4" fill={color} />
      </svg>
      <span className="whitespace-nowrap font-sans text-[11px] font-bold" style={{ color }}>
        {down ? "▼" : "▲"} {Math.abs(pct)}% <span className="font-medium text-bone/35">/ {days}d</span>
      </span>
    </div>
  );
}
