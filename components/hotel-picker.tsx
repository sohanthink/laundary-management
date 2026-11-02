"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";

export function HotelPicker({
  hotels,
  selected,
  label = "Hotel",
}: {
  hotels: { id: string; name: string }[];
  selected?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="block max-w-sm">
      <span className="mb-1.5 block text-sm font-medium text-(--ink)">{label}</span>
      <Select
        value={selected ?? ""}
        onChange={(e) => router.push(e.target.value ? `${pathname}?hotel=${e.target.value}` : pathname)}
      >
        <option value="">Choose a hotel</option>
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
