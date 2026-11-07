import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getT } from "@/server/i18n";

export type TileTone = "default" | "primary" | "money" | "danger" | "dark" | "walkin";

export type TileDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone?: TileTone;
  hint?: string;
};

const TONES: Record<TileTone, string> = {
  default: "bg-white text-(--ink) border-(--line) hover:border-(--teal)",
  primary: "bg-(--teal) text-white border-(--teal) hover:bg-(--teal-dark)",
  money: "bg-amber-400 text-(--ink) border-amber-500 hover:bg-amber-300",
  danger: "bg-red-600 text-white border-red-700 hover:bg-red-700",
  dark: "bg-(--ink) text-white border-(--ink) hover:bg-black",
  walkin: "bg-(--walkin) text-white border-(--walkin) hover:bg-(--walkin-dark)",
};

/** Big launcher tile: label top-left, icon bottom-right (as in the till software). */
export async function Tile({ href, label, icon: Icon, tone = "default", hint }: TileDef) {
  const t = await getT();
  return (
    <Link
      href={href}
      className={`group relative flex min-h-32 flex-col justify-between rounded-2xl border-2 p-4 shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--teal-soft) active:scale-[0.98] ${TONES[tone]}`}
    >
      <span className="text-lg font-semibold leading-tight">{t(label)}</span>
      {hint && <span className="text-sm opacity-80">{t(hint)}</span>}
      <Icon className="absolute bottom-4 right-4 size-10 opacity-90" strokeWidth={1.6} aria-hidden />
    </Link>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
