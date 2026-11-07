import { Home } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/components/logout-button";
import { getT } from "@/server/i18n";

export type NavItem = { href: string; label: string };

/** Touch-first shell: a big Home button instead of a sidebar, like the till software staff know. */
export async function AppShell({
  homeHref,
  userName,
  roleLabel,
  nav = [],
  actions,
  children,
}: {
  homeHref: string;
  userName: string;
  roleLabel: string;
  nav?: NavItem[];
  /** Big always-visible buttons next to HOME. Takes room, so the logo and name hide on smaller screens. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = await getT();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-(--paper)">
      <header className="no-print sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-(--line) bg-white px-4 py-3 sm:px-6">
        <BackButton homeHref={homeHref} />
        <Link
          href={homeHref}
          className="inline-flex h-14 items-center gap-2 rounded-2xl bg-(--ink) px-6 text-lg font-bold tracking-wide text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft)"
        >
          <Home className="size-6" aria-hidden />
          {t("HOME")}
        </Link>
        {actions}
        <span className={`hidden font-display text-2xl tracking-tight text-(--ink) ${actions ? "xl:inline" : "sm:inline"}`}>an-nafi</span>
        {nav.length > 0 && (
          <nav className="flex flex-wrap gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-12 items-center rounded-xl border border-(--line) px-4 text-sm font-semibold text-(--ink) hover:border-(--teal)"
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitch />
          <div className={`hidden text-right leading-tight ${actions ? "xl:block" : "md:block"}`}>
            <p className="text-sm font-semibold text-(--ink)">{userName}</p>
            <p className="text-xs text-(--muted)">{t(roleLabel)}</p>
          </div>
          <LogoutButton compact={Boolean(actions)} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
