import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { href: "/admin/audit/yearly", title: "Yearly audit", text: "Opening due, charges, payments and closing due for every hotel. CSV export." },
  { href: "/admin/audit/long-held", title: "Long-held items", text: "Pieces a hotel has kept for many days. Early warning for losses." },
  { href: "/admin/audit/log", title: "Activity log", text: "Who did what and when." },
];

export default async function ReportsPage() {
  await requirePermission("report:view");
  const customers = await db.customer.findMany({
    include: { user: true, hotels: { orderBy: { name: "asc" } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader title="Reports" description="Audits and reports across all hotels." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-3xl border border-(--line) bg-white p-5 transition hover:border-(--teal)"
          >
            <p className="font-semibold text-(--ink)">{r.title}</p>
            <p className="mt-1 text-sm text-(--muted)">{r.text}</p>
          </Link>
        ))}
      </div>
      <Card title="Client audit">
        {customers.length === 0 ? (
          <Empty>No customers yet.</Empty>
        ) : (
          <ul className="divide-y divide-(--line)">
            {customers.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <Link href={`/admin/audit/customers/${c.id}`} className="font-medium text-(--ink) hover:text-(--teal)">
                  {c.user.name}
                </Link>
                {c.hotels.map((h) => (
                  <Link key={h.id} href={`/admin/audit/hotels/${h.id}`} className="text-(--teal) hover:underline">
                    {h.name}
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
