import { addWatchItem } from "@/lib/actions";
import { SnagMark } from "@/components/SnagMark";
import { SubmitButton } from "@/components/SubmitButton";

const SIZES = ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14", "15"];

const fieldClass =
  "h-12 rounded-sm border border-bone/16 bg-ink px-3.5 font-sans text-[15px] font-medium text-bone placeholder:text-bone/32";
const labelClass = "font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-bone/40";

// Native select dressed for the dark shell, with a chevron overlay.
function Select({ name, defaultValue, children, width }: { name: string; defaultValue?: string; children: React.ReactNode; width: string }) {
  return (
    <div className="relative flex-none">
      <select
        name={name}
        defaultValue={defaultValue}
        className={`h-12 ${width} cursor-pointer rounded-sm border border-bone/16 bg-ink px-3.5 pr-9 font-sans text-sm font-semibold text-bone`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-bone/40">▾</span>
    </div>
  );
}

export function WatchlistForm() {
  return (
    <form
      action={addWatchItem}
      className="flex flex-col gap-[18px] rounded-sm border border-bone/10 bg-surface p-[18px]"
    >
      {/* model + gender + size */}
      <div className="flex flex-col gap-2.5">
        <span className={labelClass}>Model &amp; size</span>
        <div className="flex flex-wrap gap-3">
          <input
            name="title"
            required
            placeholder="Model or brand — e.g. Jordan 4 Bred, Salomon XT-6"
            className={`min-w-[240px] flex-1 ${fieldClass}`}
          />
          <Select name="gender" width="w-[112px]">
            <option value="">Anyone</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
          </Select>
          <Select name="size" width="w-[104px]">
            <option value="">Any size</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                US {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* colorway + strike + submit */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-2.5">
          <span className={labelClass}>Colorway</span>
          <input name="colorway" placeholder="Optional — e.g. Black / Fire Red" className={fieldClass} />
        </label>

        <div className="flex flex-col gap-2.5">
          <span className={`inline-flex items-center gap-1.5 ${labelClass}`}>
            <SnagMark className="h-3 w-3 text-bone/40" /> Strike
          </span>
          <div className="flex h-12 items-center gap-1.5 rounded-sm border border-bone/16 bg-ink px-3.5">
            <span className="font-display text-base font-bold text-bone/50">$</span>
            <input
              name="maxPrice"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="120"
              className="w-16 border-none bg-transparent p-0 font-display text-lg font-bold text-bone placeholder:text-bone/32 focus:outline-none"
            />
          </div>
        </div>

        <SubmitButton>Put the agent on it</SubmitButton>
      </div>
    </form>
  );
}
