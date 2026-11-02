import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { startOfMonth } from "@/server/dates";
import { getDueByHotel } from "@/server/modules/ledger/core";
import { getBucketsByProduct } from "@/server/modules/stock/core";
import { emptyBuckets, totalOwned } from "@/server/stock";

export async function getDashboard() {
  await requirePermission("admin:access");
  const monthStart = startOfMonth();

  const [dues, buckets, sendsThisMonth, paymentsThisMonth, expensesThisMonth, hotels, recentSends, openServices, recentActivity] =
    await Promise.all([
      getDueByHotel(db),
      getBucketsByProduct(db),
      db.send.aggregate({
        where: { status: "ACTIVE", createdAt: { gte: monthStart } },
        _sum: { total: true },
        _count: true,
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
      db.serviceOrder.count({ where: { status: { in: ["RECEIVED", "WASHED"] } } }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
    ]);

  const stock = [...buckets.values()].reduce((acc, b) => {
    acc.AVAILABLE += b.AVAILABLE;
    acc.AT_HOTEL += b.AT_HOTEL;
    acc.WASHING += b.WASHING;
    acc.WRITTEN_OFF += b.WRITTEN_OFF;
    return acc;
  }, emptyBuckets());

  const totalDue = [...dues.values()].reduce((s, d) => s + d, 0);
  const topDue = hotels
    .map((h) => ({ ...h, due: dues.get(h.id) ?? 0 }))
    .filter((h) => h.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  const income = paymentsThisMonth._sum.amount ?? 0;
  const expenses = expensesThisMonth._sum.amount ?? 0;

  return {
    totalDue,
    stock,
    owned: totalOwned(stock),
    month: {
      sendsTotal: sendsThisMonth._sum.total ?? 0,
      sendsCount: sendsThisMonth._count,
      income,
      expenses,
      net: income - expenses,
    },
    topDue,
    recentSends,
    openServices,
    recentActivity,
  };
}
