import type { InvoiceStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { DateRangeForm } from "@/components/date-range-form";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, rowTone, Stat, Table, Td, Th } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { formatDate, rangeFromParams } from "@/server/dates";
import { getT } from "@/server/i18n";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";
import { invoiceNumber, listInvoices } from "@/server/modules/invoices/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Invoices") };
}

const STATUSES: { value?: InvoiceStatus; label: string }[] = [
  { label: "All" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
  { value: "VOIDED", label: "Cancelled" },
];

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  const t = await getT();
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const status = STATUSES.find((s) => s.value === sp.status)?.value;
  const { invoices, unpaid, paid } = await listInvoices({ ...range, status });

  const params = (s?: InvoiceStatus) =>
    `?${new URLSearchParams({ from: range.from, to: range.to, ...(s ? { status: s } : {}) }).toString()}`;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Create an invoice for a hotel and a period. Green rows are paid."
        actions={
          <LinkButton href="/admin/invoices/new" variant="primary" size="lg">
            New invoice
          </LinkButton>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Unpaid" value={formatMoney(unpaid)} tone={unpaid > 0 ? "warn" : "good"} />
        <Stat label="Paid" value={formatMoney(paid)} tone="good" />
      </div>
      <Card
        actions={
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Link key={s.label} href={params(s.value)} className={buttonClass(status === s.value ? "dark" : "secondary", "sm")}>
                {t(s.label)}
              </Link>
            ))}
          </div>
        }
      >
        <div className="mb-4">
          <DateRangeForm from={range.from} to={range.to} extra={{ status }} />
        </div>
        {invoices.length === 0 ? (
          <Empty>No invoices in this period.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Date</Th>
                <Th>Hotel</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className={rowTone(inv.status === "PAID" ? "paid" : inv.status === "VOIDED" ? "voided" : "open")}>
                  <Td>
                    <Link href={`/admin/invoices/${inv.id}`} className="font-semibold text-(--teal) hover:underline">
                      {invoiceNumber(inv)}
                    </Link>
                  </Td>
                  <Td>{formatDate(inv.issuedAt)}</Td>
                  <Td>{inv.hotel.name}</Td>
                  <Td>
                    <Badge tone={inv.status === "PAID" ? "good" : inv.status === "VOIDED" ? "bad" : "warn"}>
                      {inv.status === "PAID" ? "Paid" : inv.status === "VOIDED" ? "Cancelled" : "Unpaid"}
                    </Badge>
                  </Td>
                  <Td>{inv.method ? t(METHOD_LABEL[inv.method]) : ""}</Td>
                  <Td align="right" className="font-semibold">
                    {formatMoney(inv.total)}
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
