import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { endOfLocalDay, startOfLocalDay } from "@/server/dates";

/** Everything that happened on one day, for the printable daily summary. */
export async function getDaySummary(isoDate: string) {
  await requirePermission("report:view");
  const from = startOfLocalDay(isoDate);
  const to = endOfLocalDay(isoDate);
  const created = { createdAt: { gte: from, lt: to } };

  const [sends, movements, itemsCollected, payments, credits, expenses] = await Promise.all([
    db.send.findMany({
      where: { status: "ACTIVE", ...created },
      include: { hotel: { select: { name: true } }, lines: true, itemLines: true },
    }),
    db.stockMovement.groupBy({
      by: ["type"],
      where: { ...created, type: { in: ["RETURN", "REJECT"] } },
      _sum: { quantity: true },
    }),
    db.hotelItemMovement.aggregate({ where: { ...created, type: "COLLECTED" }, _sum: { quantity: true } }),
    db.ledgerEntry.findMany({
      where: { type: "PAYMENT", status: "ACTIVE", date: { gte: from, lt: to } },
      include: { hotel: { select: { name: true } } },
    }),
    db.ledgerEntry.aggregate({
      where: { type: "ADJUSTMENT", status: "ACTIVE", batchId: { not: null }, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({ where: { paidAt: { gte: from, lt: to } }, _sum: { amount: true } }),
  ]);

  const moved = (type: "RETURN" | "REJECT") => movements.find((m) => m.type === type)?._sum.quantity ?? 0;
  const byMethod = new Map<PaymentMethod, number>();
  for (const p of payments) {
    const method = p.method ?? "CASH";
    byMethod.set(method, (byMethod.get(method) ?? 0) + p.amount);
  }

  const byHotel = new Map<string, { name: string; charged: number; paid: number; pieces: number }>();
  const hotelRow = (id: string, name: string) => {
    const row = byHotel.get(id) ?? { name, charged: 0, paid: 0, pieces: 0 };
    byHotel.set(id, row);
    return row;
  };
  for (const s of sends) {
    const row = hotelRow(s.hotelId, s.hotel.name);
    row.charged += s.total;
    row.pieces += s.lines.reduce((t, l) => t + l.quantity, 0);
  }
  for (const p of payments) hotelRow(p.hotelId, p.hotel.name).paid += p.amount;

  const paymentsTotal = payments.reduce((t, p) => t + p.amount, 0);
  const expensesTotal = expenses._sum.amount ?? 0;

  return {
    sends: {
      count: sends.length,
      pieces: sends.reduce((t, s) => t + s.lines.reduce((u, l) => u + l.quantity, 0), 0),
      theirItems: sends.reduce((t, s) => t + s.itemLines.reduce((u, l) => u + l.quantity, 0), 0),
      charged: sends.reduce((t, s) => t + s.total, 0),
    },
    collected: {
      returned: moved("RETURN"),
      rejected: moved("REJECT"),
      theirItems: itemsCollected._sum.quantity ?? 0,
      credits: -(credits._sum.amount ?? 0),
    },
    payments: { total: paymentsTotal, byMethod: [...byMethod.entries()] },
    expenses: expensesTotal,
    net: paymentsTotal - expensesTotal,
    hotels: [...byHotel.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
