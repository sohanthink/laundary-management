import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requirePermission } from "@/server/auth/dal";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | an-nafi admin" },
};

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/send", label: "Send" },
  { href: "/admin/return", label: "Return" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/services", label: "Washing service" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/audit", label: "Reports" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePermission("admin:access");

  return (
    <AppShell nav={NAV} homeHref="/admin" userName={user.name} roleLabel="Admin">
      {children}
    </AppShell>
  );
}
