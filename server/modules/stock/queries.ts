import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { totalOwned } from "@/server/stock";
import { bucketsFor, getBucketsByProduct } from "./core";

export async function getStockSummary() {
  await requirePermission("stock:manage");
  const [products, buckets] = await Promise.all([
    db.product.findMany({
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    getBucketsByProduct(db),
  ]);
  return products.map((product) => {
    const b = bucketsFor(buckets, product.id);
    return { product, buckets: b, owned: totalOwned(b) };
  });
}

export async function getRecentMovements(limit = 30) {
  await requirePermission("stock:manage");
  return db.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: true, hotel: true },
  });
}

export async function getActiveHotelOptions() {
  await requirePermission("admin:access");
  return db.hotel.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, customer: { select: { user: { select: { name: true } } } } },
  });
}
