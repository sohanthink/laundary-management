"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-(--teal) text-white"
                : "text-(--muted) hover:bg-(--paper) hover:text-(--ink)"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
