"use client";

import { PackageOpen, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";

type Mode = "send" | "collect";

const MODES: { key: Mode; label: string; href: string; icon: typeof Truck }[] = [
  { key: "send", label: "Send", href: "/admin/send", icon: Truck },
  { key: "collect", label: "Collect", href: "/admin/collect", icon: PackageOpen },
];

/**
 * One-tap switch between Send and Collect that keeps the chosen hotel,
 * so a hotel visit (deliver clean + pick up used) needs no extra navigation.
 */
export function ModeToggle({
  mode,
  hotelId,
  hotelName,
  dirty = false,
}: {
  mode: Mode;
  hotelId?: string;
  hotelName?: string;
  /** Ask before leaving when the current list has items. */
  dirty?: boolean;
}) {
  const t = useT();
  const router = useRouter();

  function go(target: (typeof MODES)[number]) {
    if (target.key === mode) return;
    if (dirty && !window.confirm(t("Your list is not saved yet. Switch anyway?"))) return;
    router.push(hotelId ? `${target.href}?hotel=${hotelId}` : target.href);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label={t("Send or collect")} className="inline-flex rounded-2xl border-2 border-(--line) bg-white p-1">
        {MODES.map((m) => {
          const active = m.key === mode;
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => go(m)}
              className={`inline-flex h-14 min-w-36 items-center justify-center gap-2 rounded-xl px-6 text-lg font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) ${
                active ? "bg-(--teal) text-white shadow-sm" : "text-(--ink) hover:bg-(--paper)"
              }`}
            >
              <Icon className="size-6" aria-hidden />
              {t(m.label)}
            </button>
          );
        })}
      </div>
      {hotelName && (
        <span className="rounded-2xl bg-white px-4 py-3 text-lg font-semibold text-(--ink) ring-1 ring-(--line)">
          {hotelName}
        </span>
      )}
    </div>
  );
}
