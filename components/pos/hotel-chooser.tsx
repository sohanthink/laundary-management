"use client";

import { Building2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { formatMoney } from "@/server/money";
import { ModeToggle } from "./mode-toggle";

type Hotel = { id: string; name: string; location: string; owner: string; phone: string | null; due: number };

/** Big searchable list of hotels: type a name, owner or phone number, then tap. */
export function HotelChooser({
  hotels,
  mode,
  title,
}: {
  hotels: Hotel[];
  mode: "send" | "collect";
  title: string;
}) {
  const basePath = mode === "send" ? "/admin/send" : "/admin/collect";
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter((h) =>
      [h.name, h.owner, h.location, h.phone ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [hotels, query]);

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} />
      <h1 className="font-display text-4xl tracking-tight text-(--ink)">{t(title)}</h1>
      <label className="relative block">
        <span className="sr-only">{t("Search hotel")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-(--muted)" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Type hotel name, owner or phone number")}
          className="h-16 w-full rounded-2xl border-2 border-(--line) bg-white pl-14 pr-4 text-lg outline-none focus:border-(--teal) focus:ring-4 focus:ring-(--teal-soft)"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-(--line) bg-white p-8 text-center text-(--muted)">
          {t("No hotel matches your search.")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((h) => (
            <li key={h.id}>
              <Link
                href={`${basePath}?hotel=${h.id}`}
                className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-(--line) bg-white p-4 transition hover:border-(--teal) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) active:scale-[0.99]"
              >
                <Building2 className="size-9 shrink-0 text-(--teal)" strokeWidth={1.6} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold text-(--ink)">{h.name}</span>
                  <span className="block truncate text-sm text-(--muted)">
                    {[h.owner, h.location, h.phone].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs text-(--muted)">{t("Due")}</span>
                  <span className={`block font-semibold tabular-nums ${h.due > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {formatMoney(h.due)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
