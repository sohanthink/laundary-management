import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { buttonClass } from "@/components/ui/button";
import { formatDate, startOfLocalDay, todayIso } from "@/server/dates";
import { getT } from "@/server/i18n";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";
import { getDaySummary } from "@/server/modules/reports/today";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Today") };
}

function shiftDay(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default async function TodayPage({ searchParams }: PageProps<"/admin/today">) {
  const t = await getT();
  const { date: dateParam } = await searchParams;
  const today = todayIso();
  const date = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const s = await getDaySummary(date);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href={`/admin/today?date=${shiftDay(date, -1)}`} className={buttonClass("secondary", "lg")} aria-label={t("Previous day")}>
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <Link href="/admin/today" className={buttonClass(date === today ? "dark" : "secondary", "lg")}>
          {t("Today")}
        </Link>
        <Link
          href={`/admin/today?date=${shiftDay(date, 1)}`}
          aria-disabled={date >= today}
          className={`${buttonClass("secondary", "lg")} ${date >= today ? "pointer-events-none opacity-40" : ""}`}
          aria-label={t("Next day")}
        >
          <ChevronRight className="size-6" aria-hidden />
        </Link>
        <form className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={date} max={today} className="h-14 rounded-xl border border-(--line) bg-white px-3" />
          <button type="submit" className={buttonClass("secondary", "lg")}>
            {t("Show")}
          </button>
        </form>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      {/* Narrow receipt layout: prints on 80 mm till paper or A4. */}
      <article className="receipt mx-auto w-full max-w-sm rounded-2xl border border-(--line) bg-white p-5 font-mono text-sm print:max-w-[72mm] print:rounded-none print:border-0 print:p-0">
        <p className="text-center text-base font-bold">an-nafi</p>
        <p className="mb-3 text-center">
          {t("Daily summary")} {formatDate(startOfLocalDay(date))}
        </p>

        <Section title={t("Sent")}>
          <Row label={t("Sends")} value={s.sends.count} />
          <Row label={t("Your pieces")} value={s.sends.pieces} />
          <Row label={t("Their items washed")} value={s.sends.theirItems} />
          <Row label={t("Total charged")} value={formatMoney(s.sends.charged)} strong />
        </Section>

        <Section title={t("Collected")}>
          <Row label={t("Used, returned")} value={s.collected.returned} />
          <Row label={t("Rejected")} value={s.collected.rejected} />
          <Row label={t("Their items picked up")} value={s.collected.theirItems} />
          <Row label={t("Credit for rejected")} value={s.collected.credits ? `-${formatMoney(s.collected.credits)}` : formatMoney(0)} />
        </Section>

        <Section title={t("Counter (walk-in)")}>
          <Row label={t("Orders")} value={s.counter.orders} />
          <Row label={t("Pieces")} value={s.counter.pieces} />
          <Row label={t("Total")} value={formatMoney(s.counter.total)} strong />
        </Section>

        <Section title={t("Payments (hotels + counter)")}>
          {s.payments.byMethod.length === 0 && <Row label={t("None")} value={formatMoney(0)} />}
          {s.payments.byMethod.map(([method, amount]) => (
            <Row key={method} label={t(METHOD_LABEL[method])} value={formatMoney(amount)} />
          ))}
          <Row label={t("Total received")} value={formatMoney(s.payments.total)} strong />
        </Section>

        <Section title={t("Expenses")}>
          <Row label={t("Total")} value={formatMoney(s.expenses)} />
        </Section>

        <div className="mt-2 border-t-2 border-dashed border-(--ink) pt-2">
          <Row label={t("Net (received - expenses)")} value={formatMoney(s.net)} strong />
        </div>

        {s.hotels.length > 0 && (
          <Section title={t("By hotel")}>
            {s.hotels.map((h) => (
              <div key={h.name} className="py-0.5">
                <p className="font-semibold">{h.name}</p>
                <Row label={`  ${t("Charged")} (${h.pieces} ${t("pcs")})`} value={formatMoney(h.charged)} />
                {h.paid > 0 && <Row label={`  ${t("Received")}`} value={formatMoney(h.paid)} />}
              </div>
            ))}
          </Section>
        )}
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2 border-t border-dashed border-(--muted) pt-2">
      <p className="mb-1 font-bold uppercase">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <span className="whitespace-pre">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
