"use client";

import { PackageOpen, Store, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n-provider";

const ACTIONS: { href: string; label: string; icon: LucideIcon; color: string }[] = [
  { href: "/admin/send", label: "Send", icon: Truck, color: "bg-(--teal) hover:bg-(--teal-dark)" },
  { href: "/admin/collect", label: "Collect", icon: PackageOpen, color: "bg-(--teal) hover:bg-(--teal-dark)" },
  { href: "/admin/counter", label: "Counter", icon: Store, color: "bg-(--walkin) hover:bg-(--walkin-dark)" },
];

/** The daily screens, always one tap away in the top bar. The current one is outlined. */
export function QuickActions() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t("Daily")} className="grid grid-cols-3 gap-2 max-md:order-last max-md:w-full md:flex">
      {ACTIONS.map(({ href, label, icon: Icon, color }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-bold text-white transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) active:scale-[0.98] max-lg:min-w-18 max-lg:flex-col max-lg:gap-0.5 max-lg:px-3 max-lg:text-xs ${color} ${
              current ? "outline-3 outline-offset-2 outline-(--ink)" : ""
            }`}
          >
            <Icon className="size-6 max-lg:size-5" aria-hidden />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
