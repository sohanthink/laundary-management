import type { Metadata } from "next";
import Link from "next/link";
import { DateRangeForm } from "@/components/date-range-form";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select } from "@/components/ui/field";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDate, rangeFromParams } from "@/server/dates";
import { METHOD_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import { recordPayment } from "@/server/modules/payments/actions";
import { listPayments } from "@/server/modules/payments/queries";
import { getActiveHotelOptions } from "@/server/modules/hotels/queries";
import { PaymentFields } from "./payment-fields";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const hotelId = typeof sp.hotel === "string" && sp.hotel ? sp.hotel : undefined;
  const [{ payments, total }, hotels] = await Promise.all([
    listPayments({ ...range, hotelId }),
    getActiveHotelOptions(),
  ]);

  return (
    <>
      <PageHeader title="Payments" description="Money in from hotels. Each payment reduces that hotel's due." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card
          title={`Payment history · ${formatTk(total)}`}
          actions={<DateRangeForm from={range.from} to={range.to} extra={{ hotel: hotelId }} />}
        >
          {payments.length === 0 ? (
            <Empty>No payments in this period.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Hotel</Th>
                  <Th>Method</Th>
                  <Th>Note</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={p.status === "VOIDED" ? "text-(--muted) line-through" : ""}>
                    <Td className="whitespace-nowrap">{formatDate(p.date)}</Td>
                    <Td>{p.hotel.customer.user.name}</Td>
                    <Td>
                      <Link href={`/admin/hotels/${p.hotelId}`} className="hover:text-(--teal)">
                        {p.hotel.name}
                      </Link>
                    </Td>
                    <Td>{METHOD_LABEL[p.method ?? "CASH"]}</Td>
                    <Td>
                      {p.note}
                      {p.status === "VOIDED" && <Badge tone="bad">Voided</Badge>}
                    </Td>
                    <Td align="right" className="font-semibold">
                      {formatTk(p.amount)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Record a payment">
          <ActionForm action={recordPayment} submitLabel="Record payment">
            <Field label="Hotel" name="hotelId">
              <Select name="hotelId" defaultValue={hotelId ?? ""} required>
                <option value="" disabled>
                  Choose a hotel
                </option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.customer.user.name})
                  </option>
                ))}
              </Select>
            </Field>
            <PaymentFields />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
