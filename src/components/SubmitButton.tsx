"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "solid",
}: {
  children: ReactNode;
  variant?: "solid" | "ghost";
}) {
  const { pending } = useFormStatus();
  const base = "shrink-0 rounded-sm font-sans font-bold tracking-[0.02em] transition disabled:opacity-60";
  const styles =
    variant === "ghost"
      ? "h-10 border border-bone/18 bg-transparent px-4 text-xs uppercase tracking-[0.08em] text-bone hover:border-bone/40"
      : "h-12 bg-bone px-6 text-sm text-ink hover:bg-live";
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? "Working…" : children}
    </button>
  );
}
