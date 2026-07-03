"use client";

import { useRouter } from "next/navigation";

const selectClass =
  "rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm focus:border-emerald-500 focus:outline-none";

export interface DealFilterItem {
  id: string;
  title: string;
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
    <div className="flex flex-wrap items-center gap-2">
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

      <select
        aria-label="Filter by condition"
        className={selectClass}
        value={currentCond}
        onChange={(e) => navigate(currentItem, currentSort, e.target.value)}
      >
        <option value="any">Any condition</option>
        <option value="new">Brand new</option>
        <option value="used">Used</option>
      </select>

      <select
        aria-label="Sort deals"
        className={selectClass}
        value={currentSort}
        onChange={(e) => navigate(currentItem, e.target.value, currentCond)}
      >
        <option value="best">Best deal first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}
