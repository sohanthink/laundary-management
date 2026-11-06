"use client";

import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Select } from "@/components/ui/field";

export function HotelPicker({
  hotels,
  selected,
  label = "Hotel",
  keep,
}: {
  hotels: { id: string; name: string }[];
  selected?: string;
  label?: string;
  /** Other query params to keep when the hotel changes. */
  keep?: Record<string, string>;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  function go(hotelId: string) {
    const params = new URLSearchParams(keep);
    if (hotelId) params.set("hotel", hotelId);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="block max-w-md">
      <span className="mb-1.5 block text-sm font-medium text-(--ink)">{t(label)}</span>
      <Select value={selected ?? ""} onChange={(e) => go(e.target.value)}>
        <option value="">{t("Choose a hotel")}</option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
