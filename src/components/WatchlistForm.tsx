import { addWatchItem } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none";

export function WatchlistForm() {
  return (
    <form
      action={addWatchItem}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-neutral-400">What sneaker do you want?</span>
        <input
          name="title"
          required
          placeholder="e.g. Jordan 4 Retro Bred  ·  Nike Dunk Low Panda  ·  Yeezy 350 Zebra"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-400">Max price</span>
        <input name="maxPrice" type="number" min="0" step="1" placeholder="$ (optional)" className={`${inputClass} w-32`} />
      </label>

      <SubmitButton>Add</SubmitButton>
    </form>
  );
}
