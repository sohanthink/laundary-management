import type { Metadata } from "next";
import { HotelPicker } from "@/components/hotel-picker";
import { LinkButton } from "@/components/ui/button";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { getReturnScreen } from "@/server/modules/returns/queries";
import { ReturnForm } from "./return-form";

export const metadata: Metadata = { title: "Return" };

export default async function ReturnPage({ searchParams }: PageProps<"/admin/return">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const { hotels, hotel, rows } = await getReturnScreen(hotelId);

  return (
    <>
      <PageHeader
        title="Return from hotel"
        description="Used pieces come back and go to washing. No charge."
        actions={<LinkButton href="/admin/stock">Washing queue</LinkButton>}
      />
      <Card>
        <div className="mb-6">
          <HotelPicker hotels={hotels} selected={hotel?.id} />
        </div>
        {!hotel ? (
          <Empty>Choose a hotel to see what it holds.</Empty>
        ) : rows.length === 0 ? (
          <Empty>{hotel.name} doesn&apos;t hold any of your pieces right now.</Empty>
        ) : (
          <ReturnForm key={hotel.id} hotelId={hotel.id} rows={rows} />
        )}
      </Card>
    </>
  );
}
