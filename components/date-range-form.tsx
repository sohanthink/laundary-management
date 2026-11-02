import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";

/** Plain GET form: changes ?from=&to= on the current page. */
export function DateRangeForm({
  from,
  to,
  extra,
}: {
  from: string;
  to: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3 no-print">
      {Object.entries(extra ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-(--muted)">From</span>
        <input type="date" name="from" defaultValue={from} className={`${inputClass} h-10`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-(--muted)">To</span>
        <input type="date" name="to" defaultValue={to} className={`${inputClass} h-10`} />
      </label>
      <button type="submit" className={buttonClass("secondary", "sm", "h-10")}>
        Apply
      </button>
    </form>
  );
}
