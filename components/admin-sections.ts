import {
  BarChart3,
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
  Store,
  Tag,
  Tags,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { TileDef } from "@/components/tiles";

export type SectionKey = "daily" | "office" | "setup" | "system";

/** The admin menu. Used by the HOME tiles and the section column on every page. */
export const SECTIONS: Record<SectionKey, { label: string; tiles: TileDef[] }> = {
  daily: {
    label: "Daily",
    tiles: [
      { href: "/admin/send", label: "Send", icon: Truck, tone: "primary", hint: "Products to hotel" },
      { href: "/admin/collect", label: "Collect", icon: PackageOpen, tone: "primary", hint: "Back from hotel" },
      { href: "/admin/counter", label: "Counter", icon: Store, tone: "primary", hint: "Walk-in customers" },
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
      { href: "/admin/hotels", label: "Hotels", icon: Building2, tone: "primary", hint: "All hotels and their dues" },
      { href: "/admin/customers", label: "Customers", icon: Users, hint: "Owners and hotels" },
      { href: "/admin/counter/customers", label: "Walk-in customers", icon: UserRound, hint: "Search by phone" },
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
      { href: "/admin/products/categories", label: "Categories", icon: Tags, hint: "Create these first" },
      { href: "/admin/products", label: "Products", icon: Shirt, hint: "Base prices" },
      { href: "/admin/hotels", label: "Hotel prices", icon: Users, hint: "Open a hotel, then Prices" },
      { href: "/admin/counter/prices", label: "Counter prices", icon: Tag, hint: "Walk-in price list" },
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

export const SECTION_ORDER: SectionKey[] = ["daily", "office", "setup", "system"];

/** Longest menu link that matches the path, so /admin/products/categories wins over /admin/products. */
export function findActive(pathname: string): { section: SectionKey; href: string } | null {
  let best: { section: SectionKey; href: string } | null = null;
  for (const section of SECTION_ORDER) {
    for (const tile of SECTIONS[section].tiles) {
      const match = pathname === tile.href || pathname.startsWith(`${tile.href}/`);
      if (match && (!best || tile.href.length > best.href.length)) best = { section, href: tile.href };
    }
  }
  return best;
}
