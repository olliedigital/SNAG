import { addWatchItem } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none";

export function WatchlistForm() {
  return (
    <form
      action={addWatchItem}
      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="text-stone-500">What sneaker do you want?</span>
        <input
          name="title"
          required
          placeholder="e.g. Jordan 4 Retro Bred  ·  Nike Dunk Low Panda  ·  Yeezy 350 Zebra"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-500">
          Strike price <span title="Your win price — when a listing hits it, you get the gold alert">🎯</span>
        </span>
        <input name="maxPrice" type="number" min="0" step="1" placeholder="$ (optional)" className={`${inputClass} w-32`} />
      </label>

      <SubmitButton>Add</SubmitButton>
    </form>
  );
}
