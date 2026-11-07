import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { startOfMonth } from "@/server/dates";
import { getDueByHotel } from "@/server/modules/ledger/core";
import { counterTotals, getCounterDues } from "@/server/modules/counter/queries";
import { getItemTracking, getProductTracking } from "@/server/modules/tracking/core";
import { profitSummary } from "@/server/profit";

/**
 * Hotel + walk-in money for a period. Hotel "earned" = charges plus adjustments
 * (credits, voids, special discounts); walk-in "earned" = counter orders.
 */
export async function getMoneySummary(from: Date, to: Date) {
  const range = { gte: from, lt: to };
  const [hotelLedger, counter, expenses] = await Promise.all([
    db.ledgerEntry.groupBy({
      by: ["type"],
      where: { status: "ACTIVE", date: range },
      _sum: { amount: true },
    }),
    counterTotals(db, from, to),
    db.expense.aggregate({ where: { paidAt: range }, _sum: { amount: true } }),
  ]);
  const sum = (type: "CHARGE" | "PAYMENT" | "ADJUSTMENT") =>
    hotelLedger.find((r) => r.type === type)?._sum.amount ?? 0;
  return profitSummary({
    hotelEarned: sum("CHARGE") + sum("ADJUSTMENT"),
    walkInEarned: counter.salesTotal,
    hotelReceived: sum("PAYMENT"),
    walkInReceived: counter.paymentsTotal,
    expenses: expenses._sum.amount ?? 0,
  });
}

export async function getMonthMoney() {
  await requirePermission("admin:access");
  return getMoneySummary(startOfMonth(), new Date(Date.now() + 1000));
}

export async function getHomeStats() {
  await requirePermission("admin:access");
  const [dues, counterDues, productTracks, itemTracks, unpaidInvoices] = await Promise.all([
    getDueByHotel(db),
    getCounterDues(db),
    getProductTracking(db),
    getItemTracking(db),
    db.invoice.count({ where: { status: "UNPAID" } }),
  ]);
  const balances = [...dues.values()];
  const walkInOwing = [...counterDues.values()].filter((d) => d > 0);
  return {
    walkInDue: walkInOwing.reduce((s, d) => s + d, 0),
    walkInOwing: walkInOwing.length,
    // What hotels still owe, and (separately) what some hotels paid in advance.
    totalDue: balances.filter((d) => d > 0).reduce((s, d) => s + d, 0),
    paidInAdvance: -balances.filter((d) => d < 0).reduce((s, d) => s + d, 0),
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
