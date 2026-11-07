import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { startOfMonth } from "@/server/dates";
import { getDueByHotel } from "@/server/modules/ledger/core";
import { counterTotals } from "@/server/modules/counter/queries";
import { getItemTracking, getProductTracking } from "@/server/modules/tracking/core";

export async function getHomeStats() {
  await requirePermission("admin:access");
  const [dues, productTracks, itemTracks, unpaidInvoices] = await Promise.all([
    getDueByHotel(db),
    getProductTracking(db),
    getItemTracking(db),
    db.invoice.count({ where: { status: "UNPAID" } }),
  ]);
  return {
    totalDue: [...dues.values()].reduce((s, d) => s + d, 0),
    atHotels: productTracks.reduce((s, t) => s + t.atHotel, 0),
    itemsWithUs: itemTracks.reduce((s, t) => s + t.withUs, 0),
    unpaidInvoices,
  };
}

export async function getDashboard() {
  await requirePermission("admin:access");
  const monthStart = startOfMonth();

  const [
    dues,
    productTracks,
    itemTracks,
    sendsThisMonth,
    movedThisMonth,
    paymentsThisMonth,
    expensesThisMonth,
    hotels,
    recentSends,
    recentActivity,
  ] = await Promise.all([
    getDueByHotel(db),
    getProductTracking(db),
    getItemTracking(db),
    db.send.aggregate({
      where: { status: "ACTIVE", createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    db.stockMovement.groupBy({
      by: ["type"],
      where: { createdAt: { gte: monthStart }, type: { in: ["SEND", "SEND_VOID", "RETURN", "REJECT"] } },
      _sum: { quantity: true },
    }),
    db.ledgerEntry.aggregate({
      where: { type: "PAYMENT", status: "ACTIVE", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.hotel.findMany({ select: { id: true, name: true, customer: { select: { user: { select: { name: true } } } } } }),
    db.send.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { hotel: { select: { name: true } } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const moved = (type: string) => movedThisMonth.find((m) => m.type === type)?._sum.quantity ?? 0;

  const totalDue = [...dues.values()].reduce((s, d) => s + d, 0);
  const topDue = hotels
    .map((h) => ({ ...h, due: dues.get(h.id) ?? 0 }))
    .filter((h) => h.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  const counter = await counterTotals(db, monthStart, new Date(Date.now() + 1000));
  const income = (paymentsThisMonth._sum.amount ?? 0) + counter.paymentsTotal;
  const expenses = expensesThisMonth._sum.amount ?? 0;

  return {
    totalDue,
    pieces: {
      atHotels: productTracks.reduce((s, t) => s + t.atHotel, 0),
      itemsWithUs: itemTracks.reduce((s, t) => s + t.withUs, 0),
      sentThisMonth: moved("SEND") - moved("SEND_VOID"),
      returnedThisMonth: moved("RETURN"),
      rejectedThisMonth: moved("REJECT"),
    },
    month: {
      sendsTotal: sendsThisMonth._sum.total ?? 0,
      sendsCount: sendsThisMonth._count,
      income,
      expenses,
      net: income - expenses,
    },
    topDue,
    recentSends,
    recentActivity,
  };
}
