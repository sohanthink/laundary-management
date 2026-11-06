"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { findActive } from "@/components/admin-sections";
import { useT } from "@/components/i18n-provider";

/**
 * Goes to the previous screen. When there is none (page opened directly),
 * goes to the HOME section the page belongs to.
 */
export function BackButton({ homeHref }: { homeHref: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === homeHref) return null;

  function goBack() {
    const cameFromApp = document.referrer.startsWith(window.location.origin) && window.history.length > 1;
    if (cameFromApp) {
      router.back();
      return;
    }
    const section = homeHref === "/admin" ? findActive(pathname)?.section : undefined;
    router.push(section && section !== "daily" ? `${homeHref}?s=${section}` : homeHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex h-14 items-center gap-2 rounded-2xl border-2 border-(--line) bg-white px-5 text-lg font-bold text-(--ink) transition hover:border-(--ink) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) active:scale-[0.98]"
    >
      <ArrowLeft className="size-6" aria-hidden />
      {t("Back")}
    </button>
  );
}
