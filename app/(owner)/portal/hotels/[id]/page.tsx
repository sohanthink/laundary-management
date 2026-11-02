import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateRangeForm } from "@/components/date-range-form";
import {
  HoldingsTable,
  PricesTable,
  SendsTable,
  ServiceOrdersTable,
} from "@/components/hotel-sections";
import { PrintButton } from "@/components/print-button";
import { StatementTable } from "@/components/statement-table";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader, Stat } from "@/components/ui/layout";
import { rangeFromParams } from "@/server/dates";
import { formatTk } from "@/server/money";
import { getOwnerHotel } from "@/server/modules/portal/queries";

export const metadata: Metadata = { title: "Hotel" };

export default async function OwnerHotelPage({ params, searchParams }: PageProps<"/portal/hotels/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const profile = await getOwnerHotel(id, range);
  if (!profile) notFound();
  const { hotel, prices, servicePrices, holdings, due, statement, sends, serviceOrders } = profile;

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
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Current due" value={formatTk(due)} tone={due > 0 ? "warn" : "good"} />
        <Stat label="Our pieces with you" value={holdings.reduce((s, h) => s + h.held, 0)} />
      </div>
      <div className="space-y-6">
        <Card title="Statement" actions={<DateRangeForm from={range.from} to={range.to} />}>
          <StatementTable statement={statement} sendHref={(sendId) => `/portal/sends/${sendId}`} />
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Pieces with you">
            <HoldingsTable holdings={holdings} />
          </Card>
          <Card title="Recent deliveries">
            <SendsTable sends={sends} href={(sendId) => `/portal/sends/${sendId}`} />
          </Card>
        </div>
        <Card title="Agreed prices">
          <PricesTable prices={prices} servicePrices={servicePrices} />
        </Card>
        <Card title="Washing service">
          <ServiceOrdersTable orders={serviceOrders} />
        </Card>
      </div>
    </>
  );
}
