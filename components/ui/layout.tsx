import type { ReactNode } from "react";
import { translateNode } from "@/server/i18n";

// Server components: plain-string labels are translated automatically.

export async function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl tracking-tight text-(--ink)">{await translateNode(title)}</h1>
        {description && <p className="mt-1 text-(--muted)">{await translateNode(description)}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export async function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-(--line) bg-white p-5 shadow-[0_8px_30px_rgba(20,38,31,0.04)] sm:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-(--ink)">{await translateNode(title)}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export async function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-(--ink)";
  return (
    <div className="rounded-3xl border border-(--line) bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-(--muted)">
        {await translateNode(label)}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-(--muted)">{await translateNode(hint)}</p>}
    </div>
  );
}

export async function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "info";
}) {
  const tones = {
    default: "bg-(--paper) text-(--muted) border-(--line)",
    good: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
    info: "bg-sky-50 text-sky-800 border-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {await translateNode(children)}
    </span>
  );
}

export async function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-(--line) px-4 py-8 text-center text-sm text-(--muted)">
      {await translateNode(children)}
    </p>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  );
}

export async function Th({
  children,
  align = "left",
}: {
  children?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border-b border-(--line) px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-(--muted) ${align === "right" ? "text-right" : ""}`}
    >
      {await translateNode(children)}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`border-b border-(--line)/70 px-3 py-3.5 align-middle ${align === "right" ? "text-right tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/** Paid / settled rows are green, open ones stay white (like the till software staff know). */
export function rowTone(state: "paid" | "open" | "voided" | "none") {
  if (state === "paid") return "bg-emerald-50";
  if (state === "voided") return "text-(--muted) line-through";
  return "";
}
