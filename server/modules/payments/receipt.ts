import "server-only";
import type { LedgerEntry } from "@prisma/client";
import { formatDate } from "@/server/dates";
import { emailLayout, escapeHtml } from "@/server/emails";
import { METHOD_LABEL } from "@/server/labels";
import { formatMoney } from "@/server/money";

export function paymentReceiptEmail(hotelName: string, entry: LedgerEntry, dueAfter: number) {
  const body = `
    <p><strong>${escapeHtml(hotelName)}</strong></p>
    <p>We received your payment. Thank you.</p>
    <p style="font-size:18px"><strong>${formatMoney(entry.amount)}</strong></p>
    <p>Method: ${METHOD_LABEL[entry.method ?? "CASH"]}<br/>
       Date: ${formatDate(entry.date)}<br/>
       ${entry.note ? `Note: ${escapeHtml(entry.note)}<br/>` : ""}
       Receipt #${escapeHtml(entry.id.slice(-8).toUpperCase())}</p>
    <p style="font-size:16px;color:#1d6b5c"><strong>Remaining due: ${formatMoney(dueAfter)}</strong></p>`;
  return {
    subject: `Payment received - ${hotelName} - ${formatMoney(entry.amount)}`,
    html: emailLayout("Payment receipt", body),
  };
}
