"use client";

import { useRouter } from "next/navigation";

const selectClass =
  "rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none";

export interface DealFilterItem {
  id: string;
  title: string;
}

export function DealFilters({
  items,
  currentItem,
  currentSort,
}: {
  items: DealFilterItem[];
  currentItem: string;
  currentSort: string;
}) {
  const router = useRouter();

  function navigate(item: string, sort: string) {
    const q = new URLSearchParams();
    if (item) q.set("item", item);
    if (sort && sort !== "best") q.set("sort", sort);
    const qs = q.toString();
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter by shoe"
        className={selectClass}
        value={currentItem}
        onChange={(e) => navigate(e.target.value, currentSort)}
      >
        <option value="">All shoes</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {it.title}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort deals"
        className={selectClass}
        value={currentSort}
        onChange={(e) => navigate(currentItem, e.target.value)}
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
