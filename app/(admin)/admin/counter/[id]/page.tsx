import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ActionForm } from "@/components/ui/action-form";
import { TextField } from "@/components/ui/field";
import { Badge } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/server/dates";
import { getT } from "@/server/i18n";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";
import { voidCounterSale } from "@/server/modules/counter/actions";
import { getCounterSale } from "@/server/modules/counter/queries";
import { getCompany } from "@/server/modules/settings/company";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Counter receipt") };
}

export default async function CounterReceiptPage({ params }: PageProps<"/admin/counter/[id]">) {
  const t = await getT();
  const { id } = await params;
  const [result, company] = await Promise.all([getCounterSale(id), getCompany()]);
  if (!result) notFound();
  const { sale, due } = result;
  const paidNow = sale.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <LinkButton href="/admin/counter" variant="primary" size="lg">
          New order
        </LinkButton>
        <PrintButton />
        <LinkButton href={`/admin/counter?phone=${encodeURIComponent(sale.customer.phone)}`}>Same customer</LinkButton>
        {sale.status === "ACTIVE" && (
          <div className="ml-auto">
            <Modal trigger="Void" title="Void this order" triggerVariant="danger" description="The order and the payment taken with it are cancelled.">
              <ActionForm action={voidCounterSale} submitLabel="Void order" submitVariant="danger">
                <input type="hidden" name="id" value={sale.id} />
                <TextField label="Reason" name="reason" required />
              </ActionForm>
            </Modal>
          </div>
        )}
      </div>

      {/* Narrow receipt: fits 80 mm till paper. */}
      <article className="mx-auto w-full max-w-sm rounded-2xl border border-(--line) bg-white p-5 font-mono text-sm print:max-w-[72mm] print:rounded-none print:border-0 print:p-0">
        <p className="text-center text-base font-bold">{company["company.name"] || "an-nafi"}</p>
        {company["company.phone"] && <p className="text-center">{company["company.phone"]}</p>}
        <p className="mt-2 text-center text-lg font-bold">
          {t("Ticket")} #{sale.number}
        </p>
        <p className="text-center">{formatDateTime(sale.createdAt)}</p>
        {sale.status === "VOIDED" && (
          <p className="mt-1 text-center">
            <Badge tone="bad">Voided</Badge>
          </p>
        )}
        <p className="mt-3 border-t border-dashed border-(--muted) pt-2">
          {t("Phone")}: {sale.customer.phone}
          {sale.customer.name && (
            <>
              <br />
              {sale.customer.name}
            </>
          )}
        </p>
        <div className="mt-2 space-y-1 border-t border-dashed border-(--muted) pt-2">
          {sale.lines.map((l) => (
            <div key={l.id}>
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{l.itemName}</span>
                <span className="tabular-nums">{formatMoney(l.lineTotal)}</span>
              </div>
              <div className="text-xs text-(--muted)">
                {t(l.service === "IRON_ONLY" ? "Iron only" : "Wash + iron")} · {l.quantity} × {formatMoney(l.unitPrice)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-0.5 border-t-2 border-dashed border-(--ink) pt-2">
          <Row label={t("Total")} value={formatMoney(sale.total)} strong />
          {sale.payments.map((p) => (
            <Row key={p.id} label={`${t("Paid")} (${t(METHOD_LABEL[p.method])})`} value={formatMoney(p.amount)} />
          ))}
          {paidNow === 0 && <Row label={t("Paid")} value={formatMoney(0)} />}
          <Row label={t("Total due now")} value={formatMoney(due)} strong />
        </div>
        {sale.note && <p className="mt-2 border-t border-dashed border-(--muted) pt-2">{sale.note}</p>}
        {sale.voidReason && <p className="mt-2 text-red-700">{t("Void reason")}: {sale.voidReason}</p>}
      </article>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
