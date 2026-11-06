import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, PageHeader, rowTone, Table, Td, Th } from "@/components/ui/layout";
import { formatDate } from "@/server/dates";
import { formatMoney } from "@/server/money";
import { invoiceNumber, listOwnerInvoices } from "@/server/modules/invoices/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Invoices") };
}

export default async function OwnerInvoicesPage() {
  const invoices = await listOwnerInvoices();

  return (
    <>
      <PageHeader title="Invoices" description="Your invoices. Green rows are paid." />
      <Card>
        {invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Date</Th>
                <Th>Hotel</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className={rowTone(inv.status === "PAID" ? "paid" : "open")}>
                  <Td>
                    <Link href={`/portal/invoices/${inv.id}`} className="font-semibold text-(--teal) hover:underline">
                      {invoiceNumber(inv)}
                    </Link>
                  </Td>
                  <Td>{formatDate(inv.issuedAt)}</Td>
                  <Td>{inv.hotel.name}</Td>
                  <Td>
                    <Badge tone={inv.status === "PAID" ? "good" : "warn"}>{inv.status === "PAID" ? "Paid" : "Unpaid"}</Badge>
                  </Td>
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
