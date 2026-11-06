"use client";

import { Photo } from "@/components/photo";

/** Tap to add one. Shows a count badge once something is in the list. */
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
      className={`relative flex min-h-28 flex-col justify-between gap-2 rounded-2xl border-2 bg-white p-3 text-left transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) ${
        selected ? "border-(--teal) ring-4 ring-(--teal-soft)" : "border-(--line) hover:border-(--teal)"
      }`}
    >
      <span className="flex items-start gap-2 pr-8">
        <span className="text-base font-semibold leading-tight text-(--ink)">{name}</span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <span>
          {price && <span className="block text-base font-semibold tabular-nums text-(--teal)">{price}</span>}
          {info && <span className="block text-xs text-(--muted)">{info}</span>}
        </span>
        <Photo path={photoPath} alt={name} size={44} />
      </span>
      {count > 0 && (
        <span className="absolute right-2 top-2 flex min-w-8 items-center justify-center rounded-full bg-(--teal) px-2 py-1 text-sm font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
