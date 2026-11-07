import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Card, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui/layout";
import { currentYear } from "@/server/dates";
import { formatMoney } from "@/server/money";
import { getYearlyAudit } from "@/server/modules/reports/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Yearly audit") };
}

export default async function YearlyAuditPage({ searchParams }: PageProps<"/admin/audit/yearly">) {
  const { year: yearParam } = await searchParams;
  const parsedYear = Number(yearParam);
  const year = Number.isInteger(parsedYear) && parsedYear > 2000 && parsedYear < 3000 ? parsedYear : currentYear();
  const t = await getT();
  const audit = await getYearlyAudit(year);
  const totals = audit.totals;

  return (
    <>
      <PageHeader
        title={`Yearly audit ${year}`}
        description="Due on 1 January + charges + adjustments − payments = due on 31 December."
        actions={
          <>
            <form className="flex items-end gap-2 no-print">
              <input type="number" name="year" defaultValue={year} min={2000} max={2999} className={`${inputClass} h-10 w-28`} />
              <button type="submit" className={buttonClass("secondary", "sm", "h-10")}>
                Show
              </button>
            </form>
            <a href={`/admin/audit/yearly/export?year=${year}`} className={buttonClass("secondary", "md")}>
              Export CSV
            </a>
            <PrintButton />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Income (payments received)"
          value={formatMoney(audit.income)}
          hint={`${t("Hotels")} ${formatMoney(audit.hotelIncome)} · ${t("Counter")} ${formatMoney(audit.counterIncome)}`}
          tone="good"
        />
        <Stat label="Expenses" value={formatMoney(audit.expenses)} tone="warn" />
        <Stat label="Net" value={formatMoney(audit.net)} tone={audit.net >= 0 ? "good" : "warn"} />
      </div>

      <Card title="By hotel">
        {audit.rows.length === 0 ? (
          <Empty>No hotels yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Hotel</Th>
                <Th align="right">Opening due</Th>
                <Th align="right">Charges</Th>
                <Th align="right">Adjustments</Th>
                <Th align="right">Payments</Th>
                <Th align="right">Closing due</Th>
                <Th align="right">Agreed disc.</Th>
                <Th align="right">Extra disc.</Th>
                <Th align="right">Pieces sent</Th>
              </tr>
            </thead>
            <tbody>
              {audit.rows.map((r) => (
                <tr key={r.hotelId}>
                  <Td>{r.customerName}</Td>
                  <Td>
                    <Link
                      href={`/admin/audit/hotels/${r.hotelId}?from=${year}-01-01&to=${year}-12-31`}
                      className="font-medium hover:text-(--teal)"
                    >
                      {r.hotelName}
                    </Link>
                  </Td>
                  <Td align="right">{formatMoney(r.opening)}</Td>
                  <Td align="right">{formatMoney(r.charges)}</Td>
                  <Td align="right">{formatMoney(r.adjustments)}</Td>
                  <Td align="right">{formatMoney(r.payments)}</Td>
                  <Td align="right" className="font-semibold">
                    {formatMoney(r.closing)}
                  </Td>
                  <Td align="right">{formatMoney(r.agreedDiscount)}</Td>
                  <Td align="right">{formatMoney(r.extraDiscount)}</Td>
                  <Td align="right">{r.piecesSent}</Td>
                </tr>
              ))}
              <tr className="font-semibold">
                <Td>Total</Td>
                <Td />
                <Td align="right">{formatMoney(totals.opening)}</Td>
                <Td align="right">{formatMoney(totals.charges)}</Td>
                <Td align="right">{formatMoney(totals.adjustments)}</Td>
                <Td align="right">{formatMoney(totals.payments)}</Td>
                <Td align="right">{formatMoney(totals.closing)}</Td>
                <Td align="right">{formatMoney(totals.agreedDiscount)}</Td>
                <Td align="right">{formatMoney(totals.extraDiscount)}</Td>
                <Td align="right">{totals.piecesSent}</Td>
              </tr>
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
