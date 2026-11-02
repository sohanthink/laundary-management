import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { SendReceipt } from "@/components/send-receipt";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/layout";
import { getOwnerSend } from "@/server/modules/portal/queries";

export const metadata: Metadata = { title: "Delivery receipt" };

export default async function OwnerSendPage({ params }: PageProps<"/portal/sends/[id]">) {
  const { id } = await params;
  const send = await getOwnerSend(id);
  if (!send) notFound();

  return (
    <>
      <PageHeader
        title="Delivery receipt"
        actions={
          <>
            <PrintButton />
            <LinkButton href={`/portal/hotels/${send.hotelId}`}>Back to hotel</LinkButton>
          </>
        }
      />
      <Card>
        <SendReceipt send={send} />
      </Card>
    </>
  );
}
