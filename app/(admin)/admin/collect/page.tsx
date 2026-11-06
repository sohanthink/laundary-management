import type { Metadata } from "next";
import { HotelPicker } from "@/components/hotel-picker";
import { LinkButton } from "@/components/ui/button";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { getCollectScreen } from "@/server/modules/collect/queries";
import { CollectForm } from "./collect-form";

export const metadata: Metadata = { title: "Collect" };

export default async function CollectPage({ searchParams }: PageProps<"/admin/collect">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const { hotels, hotel, rows, itemRows, due } = await getCollectScreen(hotelId);

  return (
    <>
      <PageHeader
        title="Collect from hotel"
        description="Used pieces coming back, rejected pieces (credited), and the hotel's own items to wash."
        actions={
          <>
            {hotel && (
              <LinkButton href={`/admin/send?hotel=${hotel.id}`} variant="primary">
                Send to this hotel
              </LinkButton>
            )}
            <LinkButton href="/admin/tracking">Tracking</LinkButton>
          </>
        }
      />
      <Card>
        <div className="mb-6">
          <HotelPicker hotels={hotels} selected={hotel?.id} />
        </div>
        {!hotel ? (
          <Empty>Choose a hotel.</Empty>
        ) : rows.length === 0 && itemRows.length === 0 ? (
          <Empty>{hotel.name} doesn&apos;t hold any of your products and has no washing items set up.</Empty>
        ) : (
          <CollectForm key={hotel.id} hotelId={hotel.id} rows={rows} itemRows={itemRows} due={due} />
        )}
      </Card>
    </>
  );
}
