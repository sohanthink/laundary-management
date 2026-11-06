import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";
import { getT } from "@/server/i18n";

export async function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = await getT();
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-(--paper) px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(29,107,92,0.16),transparent_36%)]" />

      <main className="relative z-10 w-full max-w-md rounded-4xl border border-(--line) bg-white p-8 shadow-[0_24px_80px_rgba(20,38,31,0.08)] sm:p-10">
        <div className="flex items-center justify-between">
          <Logo compact />
          <LanguageSwitch />
        </div>
        <h1 className="mt-8 font-display text-4xl tracking-tight text-(--ink)">
          {t(title)}
        </h1>
        <p className="mt-2 text-(--muted)">{t(description)}</p>
        {children}
      </main>
    </div>
  );
}
