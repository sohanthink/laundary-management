import type { Metadata } from "next";
import Link from "next/link";
import { HotelChooser } from "@/components/pos/hotel-chooser";
import { Card, Empty } from "@/components/ui/layout";
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

  if (!hotelId) {
    return <HotelChooser hotels={await getHotelChooserOptions()} mode="send" title="Send to which hotel?" />;
  }

  const t = await getT();
  const { hotel, rows, itemRows, due } = await getSendScreen(hotelId);
  if (!hotel) {
    return <HotelChooser hotels={await getHotelChooserOptions()} mode="send" title="Send to which hotel?" />;
  }

  if (rows.length === 0 && itemRows.length === 0) {
    return (
      <Card title={hotel.name}>
        <Empty>
          <>
            {t("This hotel has no agreed prices yet.")}{" "}
            <Link href={`/admin/hotels/${hotel.id}/prices`} className="text-(--teal) underline">
              {t("Set up its deal")}
            </Link>
          </>
        </Empty>
      </Card>
    );
  }

  return <SendPos key={hotel.id} hotel={{ id: hotel.id, name: hotel.name }} rows={rows} itemRows={itemRows} due={due} />;
}
