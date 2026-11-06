import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getProductTracking } from "@/server/modules/tracking/core";

export async function getCategories() {
  await requirePermission("catalog:manage");
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function getProduct(productId: string) {
  await requirePermission("catalog:manage");
  return db.product.findUnique({ where: { id: productId }, include: { category: true } });
}

export async function getServiceItems() {
  await requirePermission("catalog:manage");
  return db.serviceItem.findMany({ orderBy: { name: "asc" } });
}

/** Products with how many pieces are at hotels right now. */
export async function getProductsWithTracking() {
  await requirePermission("catalog:manage");
  const [products, tracks] = await Promise.all([
    db.product.findMany({
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    getProductTracking(db),
  ]);
  const atHotels = new Map<string, number>();
  for (const t of tracks) atHotels.set(t.productId, (atHotels.get(t.productId) ?? 0) + t.atHotel);
  return products.map((product) => ({ product, atHotels: atHotels.get(product.id) ?? 0 }));
}

export async function getActiveProducts() {
  await requirePermission("admin:access");
  return db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}
