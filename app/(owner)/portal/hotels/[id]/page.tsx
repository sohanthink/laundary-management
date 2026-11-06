import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateRangeForm } from "@/components/date-range-form";
import { ItemsWithUsTable, PricesTable, SendsTable, TrackingTable } from "@/components/hotel-sections";
import { PrintButton } from "@/components/print-button";
import { StatementTable } from "@/components/statement-table";
import { LinkButton } from "@/components/ui/link-button";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { rangeFromParams } from "@/server/dates";
import { formatMoney } from "@/server/money";
import { getOwnerHotel } from "@/server/modules/portal/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Hotel") };
}

export default async function OwnerHotelPage({ params, searchParams }: PageProps<"/portal/hotels/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const profile = await getOwnerHotel(id, range);
  if (!profile) notFound();
  const { hotel, prices, tracking, itemTracking, due, statement, sends } = profile;

  return (
    <>
      <PageHeader
        title={hotel.name}
        description={hotel.location}
        actions={
          <>
            <PrintButton />
            <LinkButton href="/portal">Back</LinkButton>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current due" value={formatMoney(due)} tone={due > 0 ? "warn" : "good"} />
        <Stat label="Our pieces with you" value={tracking.reduce((s, t) => s + t.atHotel, 0)} />
        <Stat label="Your items with us" value={itemTracking.reduce((s, t) => s + t.withUs, 0)} />
      </div>
      <div className="space-y-6">
        <Card title="Statement" actions={<DateRangeForm from={range.from} to={range.to} />}>
          <StatementTable statement={statement} sendHref={(sendId) => `/portal/sends/${sendId}`} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Our products: sent and returned">
            <TrackingTable tracking={tracking} />
          </Card>
          <Card title="Your items we are washing">
            <ItemsWithUsTable items={itemTracking} />
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Agreed prices">
            <PricesTable prices={prices} />
          </Card>
          <Card title="Recent deliveries">
            <SendsTable sends={sends} href={(sendId) => `/portal/sends/${sendId}`} />
          </Card>
        </div>
      </div>
    </>
  );
}
