import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";

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

export async function getActiveProducts() {
  await requirePermission("admin:access");
  return db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}
