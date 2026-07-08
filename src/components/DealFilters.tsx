"use client";

import { useRouter } from "next/navigation";

const selectClass =
  "h-10 cursor-pointer rounded-sm border border-bone/18 bg-surface px-3 pr-8 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-bone";

export interface DealFilterItem {
  id: string;
  title: string;
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-bone/40">▾</span>
    </div>
  );
}

export function DealFilters({
  items,
  currentItem,
  currentSort,
  currentCond,
}: {
  items: DealFilterItem[];
  currentItem: string;
  currentSort: string;
  currentCond: string;
}) {
  const router = useRouter();

  function navigate(item: string, sort: string, cond: string) {
    const q = new URLSearchParams();
    if (item) q.set("item", item);
    if (sort && sort !== "best") q.set("sort", sort);
    if (cond && cond !== "any") q.set("cond", cond);
    const qs = q.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Field>
        <select
          aria-label="Filter by shoe"
          className={selectClass}
          value={currentItem}
          onChange={(e) => navigate(e.target.value, currentSort, currentCond)}
        >
          <option value="">All shoes</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.title}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <select
          aria-label="Filter by condition"
          className={selectClass}
          value={currentCond}
          onChange={(e) => navigate(currentItem, currentSort, e.target.value)}
        >
          <option value="any">Any condition</option>
          <option value="new">New only</option>
          <option value="used">Used only</option>
        </select>
      </Field>

      <Field>
        <select
          aria-label="Sort deals"
          className={selectClass}
          value={currentSort}
          onChange={(e) => navigate(currentItem, e.target.value, currentCond)}
        >
          <option value="best">Biggest discount</option>
          <option value="price_asc">Lowest price</option>
          <option value="newest">Newest first</option>
        </select>
      </Field>
    </div>
  );
}
