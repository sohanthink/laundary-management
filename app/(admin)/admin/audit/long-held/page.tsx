import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDate } from "@/server/dates";
import { getLongHeld } from "@/server/modules/reports/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Long-held items") };
}

export default async function LongHeldPage({ searchParams }: PageProps<"/admin/audit/long-held">) {
  const { days: daysParam } = await searchParams;
  const parsed = Number(daysParam);
  const days = Number.isInteger(parsed) && parsed > 0 && parsed < 1000 ? parsed : 15;
  const rows = await getLongHeld(days);

  return (
    <>
      <PageHeader
        title="Long-held items"
        description="Pieces sent at least this many days ago that have not come back. Matched oldest-first."
        actions={
          <form className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-(--muted)">Days</span>
              <input type="number" name="days" min={1} defaultValue={days} className={`${inputClass} h-10 w-24`} />
            </label>
            <button type="submit" className={buttonClass("secondary", "sm", "h-10")}>
              Show
            </button>
          </form>
        }
      />
      <Card>
        {rows.length === 0 ? (
          <Empty>Nothing has been at a hotel for {days} days or more.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Hotel</Th>
                <Th>Product</Th>
                <Th align="right">Pieces</Th>
                <Th>Oldest send</Th>
                <Th align="right">Days</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.hotelId}-${r.productId}`}>
                  <Td>
                    <Link href={`/admin/hotels/${r.hotelId}`} className="font-medium hover:text-(--teal)">
                      {r.hotelName}
                    </Link>
                  </Td>
                  <Td>{r.productName}</Td>
                  <Td align="right" className="font-semibold">
                    {r.quantity}
                  </Td>
                  <Td>{formatDate(r.oldest)}</Td>
                  <Td align="right">
                    <Badge tone={r.days >= days * 2 ? "bad" : "warn"}>{r.days}</Badge>
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
