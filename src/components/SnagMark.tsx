// The SNAG hook mark — a magnet/hook with a pulsing bead. Color follows the
// parent's text color (currentColor); size via className (w-*/h-*).
export function SnagMark({
  className = "h-8 w-8",
  pulse = false,
  glow = false,
}: {
  className?: string;
  pulse?: boolean;
  glow?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 8px rgba(34,197,94,.45))" } : undefined}
      aria-hidden
    >
      <path d="M21 9 V20 a5.5 5.5 0 1 1 -5.5 -5.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="21" cy="9" r="2.7" fill="currentColor" className={pulse ? "animate-snagpulse" : undefined} />
    </svg>
  );
}
