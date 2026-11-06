import type { Metadata } from "next";
import { HotelChooser } from "@/components/pos/hotel-chooser";
import { getT } from "@/server/i18n";
import { getHotelChooserOptions } from "@/server/modules/hotels/queries";
import { getSendScreen } from "@/server/modules/send/queries";
import { SendPos } from "./send-pos";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Send") };
}

export default async function SendPage({ searchParams }: PageProps<"/admin/send">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const chooser = async () => (
    <HotelChooser hotels={await getHotelChooserOptions()} mode="send" title="Send to which hotel?" />
  );

  if (!hotelId) return chooser();
  const { hotel, rows, itemRows, products, due } = await getSendScreen(hotelId);
  if (!hotel) return chooser();

  // Shown even without a deal: the hotel may only send its own pieces to wash.
  return (
    <SendPos
      key={hotel.id}
      hotel={{ id: hotel.id, name: hotel.name }}
      rows={rows}
      itemRows={itemRows}
      products={products}
      due={due}
    />
  );
}
