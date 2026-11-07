import Link from "next/link";
import { SECTION_ORDER, SECTIONS, type SectionKey } from "@/components/admin-sections";
import { Tile, TileGrid } from "@/components/tiles";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { getHomeStats, getMonthMoney } from "@/server/modules/dashboard/queries";

export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  await requirePermission("admin:access");
  const t = await getT();
  const { s } = await searchParams;
  const active: SectionKey = typeof s === "string" && s in SECTIONS ? (s as SectionKey) : "daily";
  const [stats, money] = await Promise.all([getHomeStats(), getMonthMoney()]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label={t("Total due")} value={formatMoney(stats.totalDue)} tone={stats.totalDue > 0 ? "warn" : "good"} />
          <MiniStat label={t("Your pieces at hotels")} value={String(stats.atHotels)} />
          <MiniStat label={t("Their items with us")} value={String(stats.itemsWithUs)} />
          <MiniStat label={t("Unpaid invoices")} value={String(stats.unpaidInvoices)} tone={stats.unpaidInvoices > 0 ? "warn" : "default"} />
        </div>
        <section aria-label={t("This month")} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">{t("This month")}</h2>
            <Link href="/admin/overview" className="text-sm font-semibold text-(--teal) hover:underline">
              {t("Overview")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat
              label={t("Hotels")}
              value={formatMoney(money.hotelEarned)}
              hint={`${t("Received")} ${formatMoney(money.hotelReceived)}`}
            />
            <MiniStat
              label={t("Walk-in customers")}
              value={formatMoney(money.walkInEarned)}
              hint={`${t("Received")} ${formatMoney(money.walkInReceived)}`}
            />
            <MiniStat label={t("Expenses")} value={formatMoney(money.expenses)} tone="warn" />
            <MiniStat
              label={t("Estimated profit")}
              value={formatMoney(money.estimatedProfit)}
              hint={`${t("Cash profit")} ${formatMoney(money.cashProfit)}`}
              tone={money.estimatedProfit >= 0 ? "good" : "warn"}
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

function MiniStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  const color = tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-(--ink)";
  return (
    <div className="rounded-2xl border border-(--line) bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-(--muted)">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs tabular-nums text-(--muted)">{hint}</p>}
    </div>
  );
}
