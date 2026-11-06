import type { Metadata } from "next";
import { DateRangeForm, quickRanges } from "@/components/date-range-form";
import { HotelPicker } from "@/components/hotel-picker";
import { ActionForm } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { rangeFromParams } from "@/server/dates";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { getActiveHotelOptions } from "@/server/modules/hotels/queries";
import { createInvoice } from "@/server/modules/invoices/actions";
import { translateLine } from "@/i18n/lines";
import { getInvoicePreview } from "@/server/modules/invoices/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("New invoice") };
}

export default async function NewInvoicePage({ searchParams }: PageProps<"/admin/invoices/new">) {
  const t = await getT();
  const sp = await searchParams;
  const lastMonth = quickRanges().find((r) => r.key === "lastMonth")!;
  const range = rangeFromParams(sp.from ?? lastMonth.from, sp.to ?? lastMonth.to);
  const hotelId = typeof sp.hotel === "string" && sp.hotel ? sp.hotel : undefined;
  const [hotels, draft] = await Promise.all([
    getActiveHotelOptions(),
    hotelId ? getInvoicePreview(hotelId, range.from, range.to) : null,
  ]);

  return (
    <>
      <PageHeader
        title="New invoice"
        description="Pick a hotel and a period. Sends already on another invoice are left out."
        actions={<LinkButton href="/admin/invoices">Back</LinkButton>}
      />
      <Card className="mb-6">
        <div className="space-y-4">
          <HotelPicker hotels={hotels} selected={hotelId} keep={{ from: range.from, to: range.to }} />
          <DateRangeForm from={range.from} to={range.to} extra={{ hotel: hotelId }} />
        </div>
      </Card>

      {hotelId && draft && (
        <Card title="Preview">
          {draft.lines.length === 0 ? (
            <Empty>Nothing to invoice for this hotel in this period.</Empty>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Description</Th>
                    <Th align="right">Qty</Th>
                    <Th align="right">Price</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((l, i) => (
                    <tr key={i}>
                      <Td>{translateLine(t, l.description)}</Td>
                      <Td align="right">{l.quantity}</Td>
                      <Td align="right">{formatMoney(l.unitPrice)}</Td>
                      <Td align="right" className="font-semibold">
                        {formatMoney(l.total)}
                      </Td>
                    </tr>
                  ))}
                  <tr>
                    <Td className="font-semibold">{t("Total")}</Td>
                    <Td />
                    <Td />
                    <Td align="right" className="text-lg font-bold">
                      {formatMoney(draft.total)}
                    </Td>
                  </tr>
                </tbody>
              </Table>
              <div className="mt-6 max-w-xl">
                <ActionForm action={createInvoice} submitLabel="Create invoice" pendingLabel="Creating...">
                  <input type="hidden" name="hotelId" value={hotelId} />
                  <input type="hidden" name="from" value={range.from} />
                  <input type="hidden" name="to" value={range.to} />
                  <TextField label="Note on the invoice (optional)" name="note" />
                </ActionForm>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
