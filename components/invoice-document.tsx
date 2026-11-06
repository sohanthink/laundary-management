import { formatDate } from "@/server/dates";
import { getT } from "@/server/i18n";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";
import { invoiceNumber, type InvoiceWithDetails } from "@/server/modules/invoices/queries";
import type { Company } from "@/server/modules/settings/company";
import { translateLine } from "@/i18n/lines";

/** A4-style invoice. Print it or "Save as PDF" from the browser print dialog. */
export async function InvoiceDocument({ invoice, company }: { invoice: InvoiceWithDetails; company: Company }) {
  const t = await getT();
  const lastDay = new Date(invoice.periodTo.getTime() - 1);

  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-(--ink) print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-(--line) pb-6">
        <div className="space-y-0.5 text-sm">
          <p className="text-xl font-bold">{company["company.name"] || "an-nafi"}</p>
          {company["company.address"] && <p className="whitespace-pre-line">{company["company.address"]}</p>}
          {company["company.vat"] && <p>{t("VAT no.")}: {company["company.vat"]}</p>}
          {company["company.taxCode"] && <p>{t("Tax code")}: {company["company.taxCode"]}</p>}
          {company["company.phone"] && <p>{company["company.phone"]}</p>}
          {company["company.email"] && <p>{company["company.email"]}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {t("Invoice")} {invoiceNumber(invoice)}
          </p>
          <p className="text-sm text-(--muted)">
            {t("Date")}: {formatDate(invoice.issuedAt)}
          </p>
          <p className="text-sm text-(--muted)">
            {t("Period")}: {formatDate(invoice.periodFrom)} – {formatDate(lastDay)}
          </p>
          {invoice.status === "PAID" && (
            <p className="mt-2 inline-block rounded-lg border-2 border-emerald-600 px-3 py-1 text-sm font-bold uppercase text-emerald-700">
              {t("Paid")} {invoice.paidAt && formatDate(invoice.paidAt)}
              {invoice.method && ` · ${t(METHOD_LABEL[invoice.method])}`}
            </p>
          )}
          {invoice.status === "VOIDED" && (
            <p className="mt-2 inline-block rounded-lg border-2 border-red-600 px-3 py-1 text-sm font-bold uppercase text-red-700">
              {t("Cancelled")}
            </p>
          )}
        </div>
      </header>

      <section className="py-6 text-sm">
        <p className="text-xs uppercase tracking-wider text-(--muted)">{t("Bill to")}</p>
        <p className="text-lg font-semibold">{invoice.hotel.name}</p>
        <p>{invoice.hotel.location}</p>
        {invoice.hotel.taxNo && (
          <p>
            {t("VAT no.")}: {invoice.hotel.taxNo}
          </p>
        )}
        <p>{invoice.hotel.customer.user.name}</p>
        {invoice.hotel.email && <p>{invoice.hotel.email}</p>}
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-(--ink) text-left">
            <th className="py-2">{t("Description")}</th>
            <th className="py-2 text-right">{t("Qty")}</th>
            <th className="py-2 text-right">{t("Price")}</th>
            <th className="py-2 text-right">{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={l.id} className="border-b border-(--line)">
              <td className="py-2">{translateLine(t, l.description)}</td>
              <td className="py-2 text-right tabular-nums">{l.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(l.unitPrice)}</td>
              <td className="py-2 text-right font-medium tabular-nums">{formatMoney(l.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-base font-semibold">
              {t("Total")}
            </td>
            <td className="pt-4 text-right text-xl font-bold tabular-nums">{formatMoney(invoice.total)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="mt-10 space-y-2 border-t border-(--line) pt-4 text-sm text-(--muted)">
        {company["company.iban"] && (
          <p>
            {t("Payment by bank transfer to IBAN")}: <span className="font-medium text-(--ink)">{company["company.iban"]}</span>
          </p>
        )}
        {invoice.note && <p>{invoice.note}</p>}
        {company["company.invoiceFooter"] && <p className="whitespace-pre-line">{company["company.invoiceFooter"]}</p>}
      </footer>
    </article>
  );
}
