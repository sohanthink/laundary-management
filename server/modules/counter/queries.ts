import "server-only";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db, type Tx } from "@/server/db";
import { normalizePhone } from "@/server/counter";

type Client = Tx | typeof db;

/** Due per walk-in customer: active sales minus active payments. No auth check. */
export async function getCounterDues(client: Client, customerIds?: string[]) {
  const where = customerIds ? { customerId: { in: customerIds } } : {};
  const [sales, payments] = await Promise.all([
    client.counterSale.groupBy({ by: ["customerId"], where: { ...where, status: "ACTIVE" }, _sum: { total: true } }),
    client.counterPayment.groupBy({ by: ["customerId"], where: { ...where, status: "ACTIVE" }, _sum: { amount: true } }),
  ]);
  const dues = new Map<string, number>();
  for (const s of sales) dues.set(s.customerId, s._sum.total ?? 0);
  for (const p of payments) dues.set(p.customerId, (dues.get(p.customerId) ?? 0) - (p._sum.amount ?? 0));
  return dues;
}

export async function getCounterScreen(phone: string | undefined) {
  await requirePermission("send:create");
  const items = await db.counterItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const normalized = phone ? normalizePhone(phone) : "";
  const customer = normalized ? await db.walkInCustomer.findUnique({ where: { phone: normalized } }) : null;
  const due = customer ? ((await getCounterDues(db, [customer.id])).get(customer.id) ?? 0) : 0;
  const recent = customer
    ? await db.counterSale.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, total: true, status: true, createdAt: true },
      })
    : [];
  return { items, phone: normalized, customer, due, recent };
}

export async function listWalkInCustomers(query: string) {
  await requirePermission("admin:access");
  const q = query.trim();
  const digits = q.replace(/\D/g, "");
  const customers = await db.walkInCustomer.findMany({
    where: q
      ? { OR: [...(digits ? [{ phone: { contains: digits } }] : []), { name: { contains: q, mode: "insensitive" as const } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { sales: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
  });
  const dues = await getCounterDues(db, customers.map((c) => c.id));
  return customers.map((c) => ({ ...c, due: dues.get(c.id) ?? 0, lastVisit: c.sales[0]?.createdAt ?? null }));
}

const saleInclude = {
  customer: true,
  lines: true,
  payments: { where: { status: "ACTIVE" } },
} satisfies Prisma.CounterSaleInclude;

export type CounterSaleWithDetails = Prisma.CounterSaleGetPayload<{ include: typeof saleInclude }>;

export async function getCounterSale(saleId: string) {
  await requirePermission("admin:access");
  const sale = await db.counterSale.findUnique({ where: { id: saleId }, include: saleInclude });
  if (!sale) return null;
  const due = (await getCounterDues(db, [sale.customerId])).get(sale.customerId) ?? 0;
  return { sale, due };
}

export async function getCounterItems() {
  await requirePermission("catalog:manage");
  return db.counterItem.findMany({ orderBy: { name: "asc" } });
}

/** Counter takings in a period, for Today / Overview / yearly reports. No auth check. */
export async function counterTotals(client: Client, from: Date, to: Date) {
  const [sales, pieces, payments] = await Promise.all([
    client.counterSale.aggregate({
      where: { status: "ACTIVE", createdAt: { gte: from, lt: to } },
      _sum: { total: true },
      _count: true,
    }),
    client.counterSaleLine.aggregate({
      where: { sale: { status: "ACTIVE", createdAt: { gte: from, lt: to } } },
      _sum: { quantity: true },
    }),
    client.counterPayment.groupBy({
      by: ["method"],
      where: { status: "ACTIVE", date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);
  return {
    salesCount: sales._count,
    salesTotal: sales._sum.total ?? 0,
    pieces: pieces._sum.quantity ?? 0,
    paymentsByMethod: payments.map((p) => [p.method, p._sum.amount ?? 0] as const),
    paymentsTotal: payments.reduce((s, p) => s + (p._sum.amount ?? 0), 0),
  };
}
