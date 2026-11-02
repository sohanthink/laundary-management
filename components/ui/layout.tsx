import type { ReactNode } from "react";

export function PageHeader({
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
        <h1 className="font-display text-4xl tracking-tight text-(--ink)">
          {title}
        </h1>
        {description && <p className="mt-1 text-(--muted)">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
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
          {title && <h2 className="text-lg font-semibold text-(--ink)">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
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
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-(--muted)">{hint}</p>}
    </div>
  );
}

export function Badge({
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
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-(--line) px-4 py-8 text-center text-sm text-(--muted)">
      {children}
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

export function Th({
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
      {children}
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
      className={`border-b border-(--line)/70 px-3 py-3 align-middle ${align === "right" ? "text-right tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
