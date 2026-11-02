import "server-only";
import { formatDateTime } from "@/server/dates";
import { emailLayout, emailTable, escapeHtml } from "@/server/emails";
import { formatTk } from "@/server/money";
import type { ServiceOrderWithDetails } from "./queries";

export function serviceReceiptEmail(order: ServiceOrderWithDetails, dueAfter: number) {
  const rows = order.lines.map((l) => [
    escapeHtml(l.serviceItem.name),
    String(l.quantity),
    formatTk(l.unitPriceSnapshot),
    formatTk(l.lineTotal),
  ]);
  const body = `
    <p><strong>${escapeHtml(order.hotel.name)}</strong><br/>
       Delivered ${order.deliveredAt ? formatDateTime(order.deliveredAt) : ""}<br/>
       Order #${escapeHtml(order.id.slice(-8).toUpperCase())}</p>
    ${emailTable(["Item", "Qty", "Price", "Total"], rows)}
    <p style="text-align:right;font-size:16px"><strong>Total charged: ${formatTk(order.total)}</strong></p>
    <p style="text-align:right;font-size:16px;color:#1d6b5c"><strong>Total due now: ${formatTk(dueAfter)}</strong></p>`;
  return {
    subject: `Washing service receipt - ${order.hotel.name} - ${formatTk(order.total)}`,
    html: emailLayout("Washing service receipt", body),
  };
}
