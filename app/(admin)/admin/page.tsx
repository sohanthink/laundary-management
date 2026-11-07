import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SECTION_ORDER, SECTIONS, type SectionKey } from "@/components/admin-sections";
import { Tile, TileGrid } from "@/components/tiles";
import { requirePermission } from "@/server/auth/dal";
import { TIME_ZONE } from "@/server/dates";
import { getLocale, getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { getHomeStats, getMonthMoney } from "@/server/modules/dashboard/queries";

export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  await requirePermission("admin:access");
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const { s } = await searchParams;
  const active: SectionKey = typeof s === "string" && s in SECTIONS ? (s as SectionKey) : "daily";
  const [stats, money] = await Promise.all([getHomeStats(), getMonthMoney()]);
  const monthName = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(new Date());

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <section aria-labelledby="now" className="space-y-1.5">
          <h2 id="now" className="text-sm font-semibold text-(--ink)">
            {t("Now")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              href="/admin/hotels"
              label={t("To collect")}
              value={formatMoney(stats.totalDue + stats.walkInDue)}
              lines={[
                [t("Hotels"), formatMoney(stats.totalDue)],
                [t("Walk-in"), formatMoney(stats.walkInDue)],
              ]}
              tone={stats.totalDue + stats.walkInDue > 0 ? "warn" : "good"}
            />
            <MiniStat
              href="/admin/tracking"
              label={t("Our pieces at hotels")}
              value={String(stats.atHotels)}
              lines={[[t("Hotel items with us"), String(stats.itemsWithUs)]]}
            />
            <MiniStat
              href="/admin/invoices?status=UNPAID&from=2000-01-01"
              label={t("Unpaid invoices")}
              value={String(stats.unpaidInvoices)}
              tone={stats.unpaidInvoices > 0 ? "warn" : "default"}
            />
          </div>
        </section>
        <section aria-labelledby="this-month" className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="this-month" className="text-sm font-semibold capitalize text-(--ink)">
              {monthName}
            </h2>
            <Link href="/admin/overview" className="-my-2 inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-(--teal) hover:bg-(--teal-soft)">
              {t("Overview")}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              href="/admin/overview"
              label={t("Earned")}
              value={formatMoney(money.revenue)}
              lines={[
                [t("Hotels"), formatMoney(money.hotelEarned)],
                [t("Walk-in"), formatMoney(money.walkInEarned)],
              ]}
            />
            <MiniStat href="/admin/expenses" label={t("Spent")} value={formatMoney(money.expenses)} tone="warn" />
            <MiniStat
              href="/admin/overview"
              label={money.estimatedProfit >= 0 ? t("Profit") : t("Loss")}
              value={formatMoney(Math.abs(money.estimatedProfit))}
              lines={[[t("Earned − Spent"), ""]]}
              tone={money.estimatedProfit >= 0 ? "good" : "bad"}
            />
          </div>
        </section>
        <TileGrid>
          {SECTIONS[active].tiles.map((tile) => (
            <Tile key={`${tile.href}-${tile.label}`} {...tile} />
          ))}
        </TileGrid>
      </div>

      <nav aria-label={t("Sections")} className="flex gap-3 overflow-x-auto lg:w-44 lg:flex-col">
        {SECTION_ORDER.map((key) => (
          <Link
            key={key}
            href={key === "daily" ? "/admin" : `/admin?s=${key}`}
            aria-current={active === key ? "page" : undefined}
            className={`flex min-h-16 min-w-32 flex-1 items-center justify-center rounded-2xl border-2 px-4 text-lg font-bold transition lg:min-h-24 lg:flex-none ${
              active === key
                ? "border-(--ink) bg-(--ink) text-white"
                : "border-(--line) bg-white text-(--ink) hover:border-(--teal)"
            }`}
          >
            {t(SECTIONS[key].label)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** A compact, tappable number card: label and number on the left, a short breakdown on the right. */
function MiniStat({
  href,
  label,
  value,
  lines = [],
  tone = "default",
}: {
  href: string;
  label: string;
  value: string;
  lines?: [string, string][];
  tone?: "default" | "warn" | "good" | "bad";
}) {
  const color =
    tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-(--ink)";
  return (
    <Link
      href={href}
      className="group flex flex-wrap items-end justify-between gap-x-3 gap-y-1 rounded-2xl border-2 border-(--line) bg-white px-4 py-3 transition hover:border-(--teal) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) active:scale-[0.98]"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-(--muted)">
          {label}
          <ChevronRight className="size-4 shrink-0 group-hover:text-(--teal)" aria-hidden />
        </span>
        <span className={`block whitespace-nowrap text-xl font-bold leading-tight tabular-nums xl:text-2xl ${color}`}>{value}</span>
      </span>
      {lines.length > 0 && (
        <span className="space-y-0.5 text-xs text-(--muted)">
          {lines.map(([name, amount]) => (
            <span key={name} className="flex justify-between gap-3">
              <span>{name}</span>
              <span className="whitespace-nowrap tabular-nums">{amount}</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
