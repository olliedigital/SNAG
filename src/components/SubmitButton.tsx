"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}
