import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Option, Select, TextField } from "@/components/ui/field";
import { Card } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { todayIso } from "@/server/dates";
import { getT } from "@/server/i18n";
import { markInvoicePaid, markInvoiceUnpaid, voidInvoice } from "@/server/modules/invoices/actions";
import { getInvoice } from "@/server/modules/invoices/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Invoice") };
}

export default async function InvoicePage({ params }: PageProps<"/admin/invoices/[id]">) {
  const t = await getT();
  const { id } = await params;
  const result = await getInvoice(id);
  if (!result) notFound();
  const { invoice, company } = result;

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <LinkButton href="/admin/invoices">Back</LinkButton>
        <PrintButton />
        <LinkButton href={`/admin/hotels/${invoice.hotelId}`}>Hotel profile</LinkButton>
        <div className="ml-auto flex flex-wrap gap-2">
          {invoice.status === "UNPAID" && (
            <>
              <Modal trigger="Mark as paid" title="Mark as paid" triggerSize="md">
                <ActionForm action={markInvoicePaid} submitLabel="Mark as paid">
                  <input type="hidden" name="id" value={invoice.id} />
                  <Field label="Payment method" name="method">
                    <Select name="method" defaultValue="BANK">
                      <Option value="BANK">Bank</Option>
                      <Option value="CASH">Cash</Option>
                      <Option value="POS">POS (card)</Option>
                      <Option value="EMPLOYEE">Collected by employee</Option>
                    </Select>
                  </Field>
                  <TextField label="Date paid" name="date" type="date" defaultValue={todayIso()} required />
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="recordPayment" defaultChecked className="mt-0.5 size-5 accent-(--teal)" />
                    <span>{t("Also record the payment (reduces the hotel's due). Untick if you already entered this payment.")}</span>
                  </label>
                </ActionForm>
              </Modal>
              <Modal trigger="Void" title="Void invoice" triggerVariant="danger" description="Its sends become free to invoice again.">
                <ActionForm action={voidInvoice} submitLabel="Void invoice" submitVariant="danger">
                  <input type="hidden" name="id" value={invoice.id} />
                  <TextField label="Reason" name="reason" required />
                </ActionForm>
              </Modal>
            </>
          )}
          {invoice.status === "PAID" && (
            <ActionForm
              action={markInvoiceUnpaid}
              submitLabel="Mark as unpaid"
              submitVariant="dark"
              confirm="Mark this invoice unpaid? The payment it recorded will be voided."
              className="flex items-center gap-2"
            >
              <input type="hidden" name="id" value={invoice.id} />
            </ActionForm>
          )}
        </div>
      </div>
      <Card className="print:border-0 print:shadow-none">
        <InvoiceDocument invoice={invoice} company={company} />
      </Card>
    </>
  );
}
