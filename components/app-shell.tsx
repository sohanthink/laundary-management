import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks, type NavItem } from "@/components/nav-links";

export function AppShell({
  nav,
  homeHref,
  userName,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  homeHref: string;
  userName: string;
  roleLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-(--paper) lg:flex-row">
      <aside className="border-b border-(--line) bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:py-6">
          <Logo href={homeHref} compact />
        </div>
        <NavLinks items={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-(--line) bg-white/70 px-6 py-3 backdrop-blur">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-(--ink)">{userName}</p>
            <p className="text-xs text-(--muted)">{roleLabel}</p>
          </div>
          <LogoutButton />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
