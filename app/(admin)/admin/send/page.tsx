import type { Metadata } from "next";
import Link from "next/link";
import { HotelPicker } from "@/components/hotel-picker";
import { LinkButton } from "@/components/ui/button";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { getSendScreen } from "@/server/modules/send/queries";
import { SendForm } from "./send-form";

export const metadata: Metadata = { title: "Send" };

export default async function SendPage({ searchParams }: PageProps<"/admin/send">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const { hotels, hotel, rows, due } = await getSendScreen(hotelId);

  return (
    <>
      <PageHeader
        title="Send to hotel"
        description="Clean pieces leave your store. The hotel is charged per piece at its agreed price."
        actions={<LinkButton href="/admin/send/history">Send history</LinkButton>}
      />
      <Card>
        <div className="mb-6">
          <HotelPicker hotels={hotels} selected={hotel?.id} />
        </div>
        {!hotel ? (
          <Empty>Choose a hotel to see its agreed products.</Empty>
        ) : rows.length === 0 ? (
          <Empty>
            {hotel.name} has no agreed products yet.{" "}
            <Link href={`/admin/hotels/${hotel.id}/prices`} className="text-(--teal) underline">
              Set up its deal
            </Link>{" "}
            first.
          </Empty>
        ) : (
          <SendForm key={hotel.id} hotelId={hotel.id} rows={rows} due={due} />
        )}
      </Card>
    </>
  );
}
