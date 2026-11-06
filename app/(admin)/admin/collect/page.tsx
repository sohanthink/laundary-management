import type { Metadata } from "next";
import { HotelChooser } from "@/components/pos/hotel-chooser";
import { getHotelChooserOptions } from "@/server/modules/hotels/queries";
import { getCollectScreen } from "@/server/modules/collect/queries";
import { CollectPos } from "./collect-pos";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Collect") };
}

export default async function CollectPage({ searchParams }: PageProps<"/admin/collect">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const chooser = async () => (
    <HotelChooser hotels={await getHotelChooserOptions()} mode="collect" title="Collect from which hotel?" />
  );

  if (!hotelId) return chooser();
  const { hotel, rows, itemRows, due } = await getCollectScreen(hotelId);
  if (!hotel) return chooser();

  return <CollectPos key={hotel.id} hotel={{ id: hotel.id, name: hotel.name }} rows={rows} itemRows={itemRows} due={due} />;
}
