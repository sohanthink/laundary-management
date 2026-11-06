"use client";

import { Photo } from "@/components/photo";

/** Compact tap-to-add tile, so many products fit without scrolling. */
export function ProductTile({
  name,
  price,
  info,
  photoPath,
  count,
  selected,
  onTap,
}: {
  name: string;
  price?: string;
  info?: string;
  photoPath?: string | null;
  count: number;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={selected}
      className={`relative flex min-h-24 flex-col justify-between gap-1 rounded-xl border-2 bg-white p-2.5 text-left transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) ${
        selected ? "border-(--teal) ring-4 ring-(--teal-soft)" : "border-(--line) hover:border-(--teal)"
      }`}
    >
      <span className="line-clamp-2 pr-7 text-sm font-semibold leading-tight text-(--ink)">{name}</span>
      <span className="flex items-end justify-between gap-1">
        <span className="min-w-0">
          {price && <span className="block text-sm font-semibold tabular-nums text-(--teal)">{price}</span>}
          {info && <span className="block truncate text-[11px] text-(--muted)">{info}</span>}
        </span>
        <Photo path={photoPath} alt={name} size={32} />
      </span>
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 flex min-w-7 items-center justify-center rounded-full bg-(--teal) px-1.5 py-0.5 text-xs font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
