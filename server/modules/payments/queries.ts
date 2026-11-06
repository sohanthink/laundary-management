import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { endOfLocalDay, startOfLocalDay } from "@/server/dates";

export async function listPayments(filter: { hotelId?: string; from: string; to: string }) {
  await requirePermission("payment:manage");
  const payments = await db.ledgerEntry.findMany({
    where: {
      type: "PAYMENT",
      ...(filter.hotelId ? { hotelId: filter.hotelId } : {}),
      date: { gte: startOfLocalDay(filter.from), lt: endOfLocalDay(filter.to) },
    },
    include: { hotel: { include: { customer: { include: { user: true } } } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const total = payments.filter((p) => p.status === "ACTIVE").reduce((s, p) => s + p.amount, 0);
  return { payments, total };
}
