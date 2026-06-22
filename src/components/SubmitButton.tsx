"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}
