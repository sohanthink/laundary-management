import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDueByHotel } from "@/server/modules/ledger/core";

export async function listCustomers() {
  await requirePermission("customer:manage");
  const [customers, dues] = await Promise.all([
    db.customer.findMany({
      include: { user: true, hotels: { select: { id: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    getDueByHotel(db),
  ]);
  return customers.map((c) => ({
    ...c,
    totalDue: c.hotels.reduce((sum, h) => sum + (dues.get(h.id) ?? 0), 0),
  }));
}

export async function getCustomer(customerId: string) {
  await requirePermission("customer:manage");
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: { user: true, hotels: { orderBy: { name: "asc" } } },
  });
  if (!customer) return null;
  const dues = await getDueByHotel(db, customer.hotels.map((h) => h.id));
  return {
    ...customer,
    hotels: customer.hotels.map((h) => ({ ...h, due: dues.get(h.id) ?? 0 })),
  };
}
