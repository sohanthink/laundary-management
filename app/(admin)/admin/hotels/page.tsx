import type { Metadata } from "next";
import Link from "next/link";
import { HotelChooser } from "@/components/pos/hotel-chooser";
import { getT } from "@/server/i18n";
import { getHotelChooserOptions } from "@/server/modules/hotels/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Hotels") };
}

export default async function HotelsPage() {
  const t = await getT();
  const hotels = await getHotelChooserOptions();

  return (
    <div className="space-y-4">
      <HotelChooser hotels={hotels} mode="profile" title="Hotels" />
      <p className="text-sm text-(--muted)">
        {t("To add a hotel, open its owner in Customers.")}{" "}
        <Link href="/admin/customers" className="font-medium text-(--teal) underline">
          {t("Customers")}
        </Link>
      </p>
    </div>
  );
}
