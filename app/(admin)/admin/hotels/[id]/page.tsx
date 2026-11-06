import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateRangeForm } from "@/components/date-range-form";
import { ItemsWithUsTable, PricesTable, SendsTable, TrackingTable } from "@/components/hotel-sections";
import { StatementTable } from "@/components/statement-table";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/link-button";
import { Field, Option, Select, TextField } from "@/components/ui/field";
import { Badge, Card, PageHeader, Stat } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { rangeFromParams, todayIso } from "@/server/dates";
import { formatMoney } from "@/server/money";
import { updateHotel } from "@/server/modules/customers/actions";
import { getHotelProfile } from "@/server/modules/hotels/queries";
import { addAdjustment, recordPayment, voidLedgerEntry } from "@/server/modules/payments/actions";
import { HotelFields } from "../../customers/fields";
import { PaymentFields } from "../../payments/payment-fields";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Hotel") };
}

export default async function HotelProfilePage({ params, searchParams }: PageProps<"/admin/hotels/[id]">) {
  const { id } = await params;
  const t = await getT();
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const profile = await getHotelProfile(id, range);
  if (!profile) notFound();
  const { hotel, prices, tracking, itemTracking, due, statement, sends } = profile;
  const piecesHeld = tracking.reduce((s, t) => s + t.atHotel, 0);
  const itemsWithUs = itemTracking.reduce((s, t) => s + t.withUs, 0);

  return (
    <>
      <PageHeader
        title={hotel.name}
        description={
          <>
            {hotel.location} · {t("Owner")}{" "}
            <Link href={`/admin/customers/${hotel.customerId}`} className="text-(--teal) underline">
              {hotel.customer.user.name}
            </Link>{" "}
            {!hotel.isActive && <Badge>Inactive</Badge>}
          </>
        }
        actions={
          <>
            <LinkButton href={`/admin/send?hotel=${hotel.id}`} variant="primary">
              Send
            </LinkButton>
            <LinkButton href={`/admin/collect?hotel=${hotel.id}`}>Collect</LinkButton>
            <LinkButton href={`/admin/hotels/${hotel.id}/prices`}>Prices</LinkButton>
            <LinkButton href={`/admin/invoices/new?hotel=${hotel.id}`}>Invoice</LinkButton>
            <LinkButton href={`/admin/audit/hotels/${hotel.id}`}>Audit</LinkButton>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current due" value={formatMoney(due)} tone={due > 0 ? "warn" : "good"} />
        <Stat label="Your pieces at hotel" value={piecesHeld} />
        <Stat label="Their items with us" value={itemsWithUs} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Modal trigger="Record payment" title={`${t("Payment from")} ${hotel.name}`}>
          <ActionForm action={recordPayment} submitLabel="Record payment">
            <input type="hidden" name="hotelId" value={hotel.id} />
            <PaymentFields />
          </ActionForm>
        </Modal>
        <Modal
          trigger="Adjustment"
          title="Add an adjustment"
          triggerVariant="secondary"
          description="For corrections or a special discount. Always explain why."
        >
          <ActionForm action={addAdjustment} submitLabel="Add adjustment">
            <input type="hidden" name="hotelId" value={hotel.id} />
            <Field label="Type" name="direction">
              <Select name="direction" defaultValue="DECREASE">
                <Option value="DECREASE">Reduce the due (discount, correction)</Option>
                <Option value="INCREASE">Increase the due (missed charge)</Option>
              </Select>
            </Field>
            <TextField label="Amount (€)" name="amount" inputMode="decimal" required />
            <TextField label="Date" name="date" type="date" defaultValue={todayIso()} required />
            <TextField label="Reason" name="note" required />
          </ActionForm>
        </Modal>
        <Modal trigger="Edit hotel" title="Edit hotel" triggerVariant="secondary">
          <ActionForm action={updateHotel} submitLabel="Save" resetOnSuccess={false}>
            <input type="hidden" name="id" value={hotel.id} />
            <HotelFields hotel={hotel} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={hotel.isActive} className="size-4 accent-(--teal)" />
              {t("Active")}
            </label>
          </ActionForm>
        </Modal>
      </div>

      <div className="space-y-6">
        <Card title="Statement" actions={<DateRangeForm from={range.from} to={range.to} />}>
          <StatementTable
            statement={statement}
            sendHref={(sendId) => `/admin/send/${sendId}`}
            actions={(row) =>
              row.type !== "CHARGE" && !(row.type === "ADJUSTMENT" && row.sendId) ? (
                <Modal trigger="Void" title="Void entry" triggerVariant="ghost" triggerSize="sm">
                  <ActionForm action={voidLedgerEntry} submitLabel="Void" submitVariant="danger">
                    <input type="hidden" name="id" value={row.id} />
                    <TextField label="Reason" name="reason" required />
                  </ActionForm>
                </Modal>
              ) : null
            }
          />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Your products: sent and back">
            <TrackingTable tracking={tracking} />
          </Card>
          <Card title="Their own items with us">
            <ItemsWithUsTable items={itemTracking} />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Agreed prices" actions={<LinkButton href={`/admin/hotels/${hotel.id}/prices`} size="sm">Edit prices</LinkButton>}>
            <PricesTable prices={prices} />
          </Card>
          <Card title="Recent sends" actions={<LinkButton href={`/admin/audit/hotels/${hotel.id}`} size="sm" variant="ghost">All activity</LinkButton>}>
            <SendsTable sends={sends} href={(sendId) => `/admin/send/${sendId}`} />
          </Card>
        </div>

        <Card title="Details">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Detail label="Email" value={hotel.email} />
            <Detail label="Phone" value={hotel.phone} />
            <Detail label="Tax no." value={hotel.taxNo} />
            <Detail label="Trade license" value={hotel.tradeLicense} />
            <Detail label="Owner email" value={hotel.customer.user.email} />
            <Detail label="Owner phone" value={hotel.customer.phone} />
          </dl>
        </Card>
      </div>
    </>
  );
}

async function Detail({ label, value }: { label: string; value: string | null }) {
  const t = await getT();
  return (
    <div>
      <dt className="text-xs text-(--muted)">{t(label)}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}
