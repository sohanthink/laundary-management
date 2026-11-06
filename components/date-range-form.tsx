import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getT } from "@/server/i18n";
import { todayIso } from "@/server/dates";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** Quick ranges like the till software: Today, This week, This month, ... */
export function quickRanges(today = todayIso()) {
  const [y, m, d] = today.split("-").map(Number);
  const date = utc(y, m - 1, d);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  const q = Math.floor((m - 1) / 3);
  return [
    { key: "today", label: "Today", from: today, to: today },
    { key: "week", label: "This week", from: iso(utc(y, m - 1, d - weekday)), to: today },
    { key: "month", label: "This month", from: iso(utc(y, m - 1, 1)), to: today },
    { key: "lastMonth", label: "Last month", from: iso(utc(y, m - 2, 1)), to: iso(utc(y, m - 1, 0)) },
    { key: "quarter", label: "This quarter", from: iso(utc(y, q * 3, 1)), to: today },
    { key: "year", label: "This year", from: `${y}-01-01`, to: today },
  ];
}

/** Quick range buttons plus custom From / To. Keeps other query params via `extra`. */
export async function DateRangeForm({
  from,
  to,
  extra,
  basePath,
}: {
  from: string;
  to: string;
  extra?: Record<string, string | undefined>;
  basePath?: string;
}) {
  const t = await getT();
  const keep = Object.entries(extra ?? {}).filter(([, v]) => v) as [string, string][];
  const href = (f: string, tt: string) => {
    const params = new URLSearchParams([...keep, ["from", f], ["to", tt]]);
    return `${basePath ?? ""}?${params.toString()}`;
  };

  return (
    <div className="no-print flex flex-wrap items-end gap-2">
      {quickRanges().map((r) => {
        const active = r.from === from && r.to === to;
        return (
          <Link
            key={r.key}
            href={href(r.from, r.to)}
            aria-current={active ? "true" : undefined}
            className={buttonClass(active ? "dark" : "secondary", "sm")}
          >
            {t(r.label)}
          </Link>
        );
      })}
      <form key={`${from}:${to}`} className="flex flex-wrap items-end gap-2">
        {keep.map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-(--muted)">{t("From")}</span>
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-xl border border-(--line) bg-(--paper) px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-(--muted)">{t("To")}</span>
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-xl border border-(--line) bg-(--paper) px-3 text-sm" />
        </label>
        <button type="submit" className={buttonClass("secondary", "sm")}>
          {t("Apply")}
        </button>
      </form>
    </div>
  );
}
