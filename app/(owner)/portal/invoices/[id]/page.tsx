import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { Card } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { getOwnerInvoice } from "@/server/modules/invoices/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Invoice") };
}

export default async function OwnerInvoicePage({ params }: PageProps<"/portal/invoices/[id]">) {
  const { id } = await params;
  const result = await getOwnerInvoice(id);
  if (!result) notFound();

  return (
    <>
      <div className="no-print mb-6 flex gap-2">
        <LinkButton href="/portal/invoices">Back</LinkButton>
        <PrintButton />
      </div>
      <Card className="print:border-0 print:shadow-none">
        <InvoiceDocument invoice={result.invoice} company={result.company} />
      </Card>
    </>
  );
}
