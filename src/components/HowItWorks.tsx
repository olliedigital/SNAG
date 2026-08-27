"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { n: "1", t: "Name your pair", d: "Add the exact shoe — model, size, colorway." },
  { n: "2", t: "Set your strike", d: "Your target price. That's your win number." },
  { n: "3", t: "Let it hunt", d: "SNAG scans 24/7 and pings you the second it hits." },
];

// A dismissible first-run guide so the app opens as an interactive tool you set
// up, not a static list. Remembered per device via localStorage.
export function HowItWorks() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem("snag_hiw_dismissed") !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem("snag_hiw_dismissed", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-sm border border-bone/10 bg-surface p-5 sm:flex-row sm:gap-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-2.5 text-lg leading-none text-bone/30 transition hover:text-bone/70"
      >
        ×
      </button>
      {STEPS.map((s) => (
        <div key={s.n} className="flex flex-1 gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-live/40 font-display text-sm font-bold text-live">
            {s.n}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-[13px] font-bold">{s.t}</span>
            <span className="font-sans text-[12px] leading-snug text-bone/50">{s.d}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
