import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { SendReceipt } from "@/components/send-receipt";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { isEmailConfigured } from "@/server/email";
import { voidSend } from "@/server/modules/send/actions";
import { getSend } from "@/server/modules/send/queries";

export const metadata: Metadata = { title: "Send receipt" };

export default async function SendReceiptPage({ params, searchParams }: PageProps<"/admin/send/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const send = await getSend(id);
  if (!send) notFound();

  return (
    <>
      <PageHeader
        title="Send receipt"
        description={
          saved
            ? isEmailConfigured()
              ? "Saved. The receipt is being emailed to the hotel."
              : "Saved. Email is not set up, so print or share this receipt."
            : undefined
        }
        actions={
          <>
            <PrintButton />
            <LinkButton href={`/admin/send?hotel=${send.hotelId}`} variant="primary">
              New send
            </LinkButton>
            <LinkButton href={`/admin/hotels/${send.hotelId}`}>Hotel profile</LinkButton>
            {send.status === "ACTIVE" && (
              <Modal
                trigger="Void"
                title="Void this send"
                triggerVariant="danger"
                description="Pieces go back to available stock and the charge is reversed. Only possible if the hotel still has all the pieces."
              >
                <ActionForm action={voidSend} submitLabel="Void send" submitVariant="danger">
                  <input type="hidden" name="id" value={send.id} />
                  <TextField label="Reason" name="reason" placeholder="Entered wrong quantity" required />
                </ActionForm>
              </Modal>
            )}
          </>
        }
      />
      <Card>
        <SendReceipt send={send} />
      </Card>
    </>
  );
}
