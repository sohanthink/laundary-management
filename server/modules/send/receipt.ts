import "server-only";
import { formatDateTime } from "@/server/dates";
import { emailLayout, emailTable, escapeHtml } from "@/server/emails";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";
import type { SendWithDetails } from "./queries";

export function receiptRecipient(hotel: { email: string | null; customer: { user: { email: string } } }) {
  return hotel.email ?? hotel.customer.user.email;
}

export function sendReceiptEmail(send: SendWithDetails, dueAfter: number) {
  const payments = send.ledgerEntries.filter((e) => e.type === "PAYMENT" && e.status === "ACTIVE");

  const productRows = send.lines.map((l) => [
    escapeHtml(l.product.name),
    String(l.quantity),
    formatMoney(l.basePriceSnapshot),
    formatMoney(l.agreedPriceSnapshot),
    l.extraDiscountPerPiece ? `-${formatMoney(l.extraDiscountPerPiece)}` : "-",
    formatMoney(l.finalUnitPrice),
    formatMoney(l.lineTotal),
  ]);
  const itemRows = send.itemLines.map((l) => [
    escapeHtml(l.serviceItem.name),
    String(l.quantity),
    formatMoney(l.unitPriceSnapshot),
    formatMoney(l.lineTotal),
  ]);

  const body = `
    <p><strong>${escapeHtml(send.hotel.name)}</strong><br/>${formatDateTime(send.createdAt)}<br/>Receipt #${escapeHtml(send.id.slice(-8).toUpperCase())}</p>
    ${productRows.length ? emailTable(["Product", "Qty", "Base", "Agreed", "Extra", "Final", "Total"], productRows) : ""}
    ${itemRows.length ? `<p style="margin:16px 0 0"><strong>Your items washed</strong></p>${emailTable(["Item", "Qty", "Price", "Total"], itemRows)}` : ""}
    <p style="text-align:right;margin:4px 0">Subtotal: ${formatMoney(send.subtotal)}</p>
    ${send.wholeDiscount ? `<p style="text-align:right;margin:4px 0">Extra discount: -${formatMoney(send.wholeDiscount)}</p>` : ""}
    ${send.discountReason ? `<p style="text-align:right;margin:4px 0;color:#5d6f68">Reason: ${escapeHtml(send.discountReason)}</p>` : ""}
    <p style="text-align:right;margin:8px 0;font-size:16px"><strong>Total charged: ${formatMoney(send.total)}</strong></p>
    ${payments
      .map((p) => `<p style="text-align:right;margin:4px 0">Paid now (${METHOD_LABEL[p.method ?? "CASH"]}): ${formatMoney(p.amount)}</p>`)
      .join("")}
    <p style="text-align:right;margin:8px 0;font-size:16px;color:#1d6b5c"><strong>Total due now: ${formatMoney(dueAfter)}</strong></p>`;

  return {
    subject: `Delivery receipt - ${send.hotel.name} - ${formatMoney(send.total)}`,
    html: emailLayout("Delivery receipt", body),
  };
}
