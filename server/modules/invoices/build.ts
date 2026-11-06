import "server-only";
import { db, type Tx } from "@/server/db";
import { endOfLocalDay, startOfLocalDay } from "@/server/dates";

type Client = Tx | typeof db;

export type DraftLine = { description: string; quantity: number; unitPrice: number; total: number };

/**
 * Collects everything not yet invoiced for a hotel in the period:
 * active sends (products, washed hotel items, whole-send discounts) and
 * credits for rejected pieces. Lines with the same name and price are merged.
 */
export async function buildInvoiceDraft(client: Client, hotelId: string, fromIso: string, toIso: string) {
  const from = startOfLocalDay(fromIso);
  const to = endOfLocalDay(toIso);

  const [sends, credits] = await Promise.all([
    client.send.findMany({
      where: { hotelId, status: "ACTIVE", invoiceId: null, createdAt: { gte: from, lt: to } },
      include: {
        lines: { include: { product: true } },
        itemLines: { include: { serviceItem: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    client.ledgerEntry.findMany({
      where: {
        hotelId,
        type: "ADJUSTMENT",
        status: "ACTIVE",
        invoiceId: null,
        batchId: { not: null },
        date: { gte: from, lt: to },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const merged = new Map<string, DraftLine>();
  const add = (description: string, quantity: number, unitPrice: number) => {
    const key = `${description}|${unitPrice}`;
    const line = merged.get(key) ?? { description, quantity: 0, unitPrice, total: 0 };
    line.quantity += quantity;
    line.total += quantity * unitPrice;
    merged.set(key, line);
  };

  let wholeDiscount = 0;
  for (const send of sends) {
    for (const l of send.lines) add(l.product.name, l.quantity, l.finalUnitPrice);
    for (const l of send.itemLines) add(`${l.serviceItem.name} (washing)`, l.quantity, l.unitPriceSnapshot);
    wholeDiscount += send.wholeDiscount;
  }

  const lines: DraftLine[] = [...merged.values()];
  if (wholeDiscount > 0) {
    lines.push({ description: "Extra discount", quantity: 1, unitPrice: -wholeDiscount, total: -wholeDiscount });
  }
  for (const c of credits) {
    lines.push({ description: c.note ?? "Credit", quantity: 1, unitPrice: c.amount, total: c.amount });
  }

  return {
    from,
    to,
    sendIds: sends.map((s) => s.id),
    creditIds: credits.map((c) => c.id),
    lines,
    total: lines.reduce((s, l) => s + l.total, 0),
  };
}
