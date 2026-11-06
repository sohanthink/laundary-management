import {
  BarChart3,
  Bed,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Gauge,
  History,
  Hourglass,
  KeyRound,
  ListChecks,
  PackageOpen,
  Receipt,
  Search,
  Shirt,
  Tags,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Tile, TileGrid, type TileDef } from "@/components/tiles";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { getHomeStats } from "@/server/modules/dashboard/queries";

const SECTIONS: Record<string, { label: string; tiles: TileDef[] }> = {
  daily: {
    label: "Daily",
    tiles: [
      { href: "/admin/send", label: "Send", icon: Truck, tone: "primary", hint: "Products to hotel" },
      { href: "/admin/collect", label: "Collect", icon: PackageOpen, tone: "primary", hint: "Back from hotel" },
      { href: "/admin/payments", label: "Payment", icon: Wallet, tone: "money", hint: "Money received" },
      { href: "/admin/expenses", label: "Expense", icon: Receipt, tone: "dark", hint: "Money spent" },
      { href: "/admin/today", label: "Today", icon: CalendarDays, hint: "Daily summary" },
      { href: "/admin/tracking", label: "Tracking", icon: ClipboardList, hint: "Sent and returned" },
      { href: "/admin/send/history", label: "Send history", icon: History },
    ],
  },
  office: {
    label: "Office",
    tiles: [
      { href: "/admin/customers", label: "Customers", icon: Users, hint: "Owners and hotels" },
      { href: "/admin/invoices", label: "Invoices", icon: FileText, tone: "money" },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/expenses", label: "Expenses", icon: Receipt },
      { href: "/admin/overview", label: "Overview", icon: Gauge },
      { href: "/admin/audit/yearly", label: "Yearly audit", icon: BarChart3 },
      { href: "/admin/audit", label: "Client audit", icon: Search },
      { href: "/admin/audit/long-held", label: "Long-held items", icon: Hourglass },
    ],
  },
  setup: {
    label: "Setup",
    tiles: [
      { href: "/admin/products", label: "Products", icon: Shirt, hint: "Base prices" },
      { href: "/admin/products/categories", label: "Categories", icon: Tags },
      { href: "/admin/products/hotel-items", label: "Hotel's own items", icon: Bed },
      { href: "/admin/customers", label: "Hotel prices", icon: Users, hint: "Open a hotel, then Prices" },
      { href: "/admin/settings", label: "Company details", icon: Building2, hint: "Shown on invoices" },
    ],
  },
  system: {
    label: "System",
    tiles: [
      { href: "/change-password", label: "Change password", icon: KeyRound },
      { href: "/admin/audit/log", label: "Activity log", icon: ListChecks },
    ],
  },
};

const ORDER = ["daily", "office", "setup", "system"] as const;

export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  await requirePermission("admin:access");
  const t = await getT();
  const { s } = await searchParams;
  const active = typeof s === "string" && s in SECTIONS ? s : "daily";
  const stats = await getHomeStats();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat label={t("Total due")} value={formatMoney(stats.totalDue)} tone={stats.totalDue > 0 ? "warn" : "good"} />
          <MiniStat label={t("Your pieces at hotels")} value={String(stats.atHotels)} />
          <MiniStat label={t("Their items with us")} value={String(stats.itemsWithUs)} />
          <MiniStat label={t("Unpaid invoices")} value={String(stats.unpaidInvoices)} tone={stats.unpaidInvoices > 0 ? "warn" : "default"} />
        </div>
        <TileGrid>
          {SECTIONS[active].tiles.map((tile) => (
            <Tile key={`${tile.href}-${tile.label}`} {...tile} />
          ))}
        </TileGrid>
      </div>

      <nav aria-label={t("Sections")} className="flex gap-3 overflow-x-auto lg:w-44 lg:flex-col">
        {ORDER.map((key) => (
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

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" | "good" }) {
  const color = tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-(--ink)";
  return (
    <div className="rounded-2xl border border-(--line) bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-(--muted)">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
