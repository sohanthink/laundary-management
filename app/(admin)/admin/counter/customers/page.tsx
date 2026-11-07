import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { formatDate } from "@/server/dates";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { listWalkInCustomers } from "@/server/modules/counter/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Walk-in customers") };
}

export default async function WalkInCustomersPage({ searchParams }: PageProps<"/admin/counter/customers">) {
  const t = await getT();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const customers = await listWalkInCustomers(query);
  const totalDue = customers.reduce((s, c) => s + Math.max(0, c.due), 0);

  return (
    <>
      <PageHeader
        title="Walk-in customers"
        description={`${t("Customers who are not hotels. Total due")}: ${formatMoney(totalDue)}`}
        actions={<LinkButton href="/admin/counter" variant="primary">Open counter</LinkButton>}
      />
      <Card>
        <form className="mb-4 flex gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">{t("Search")}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-(--muted)" aria-hidden />
            <input
              name="q"
              defaultValue={query}
              inputMode="search"
              placeholder={t("Phone number or name")}
              className="h-14 w-full rounded-2xl border-2 border-(--line) bg-white pl-12 pr-4 text-lg outline-none focus:border-(--teal)"
            />
          </label>
          <button type="submit" className={buttonClass("secondary", "lg")}>
            {t("Search")}
          </button>
        </form>
        {customers.length === 0 ? (
          <Empty>No walk-in customers found.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Phone</Th>
                <Th>Name</Th>
                <Th>Last visit</Th>
                <Th align="right">Due</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={c.due > 0 ? "" : "bg-emerald-50"}>
                  <Td>
                    <Link href={`/admin/counter?phone=${encodeURIComponent(c.phone)}`} className="font-semibold text-(--teal) hover:underline">
                      {c.phone}
                    </Link>
                  </Td>
                  <Td>{c.name ?? ""}</Td>
                  <Td>{c.lastVisit ? formatDate(c.lastVisit) : "-"}</Td>
                  <Td align="right" className={`font-semibold ${c.due > 0 ? "text-amber-700" : ""}`}>
                    {formatMoney(c.due)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
