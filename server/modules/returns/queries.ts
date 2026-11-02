import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getBucketsByProduct } from "@/server/modules/stock/core";

/** What each product the hotel currently holds. No auth check (internal). */
export async function hotelHoldings(hotelId: string) {
  const buckets = await getBucketsByProduct(db, { hotelId });
  const held = [...buckets.entries()].filter(([, b]) => b.AT_HOTEL > 0);
  if (held.length === 0) return [];
  const products = await db.product.findMany({
    where: { id: { in: held.map(([productId]) => productId) } },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const qty = new Map(held.map(([productId, b]) => [productId, b.AT_HOTEL]));
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    category: p.category.name,
    photoPath: p.photoPath,
    held: qty.get(p.id) ?? 0,
  }));
}

export async function getReturnScreen(hotelId: string | undefined) {
  await requirePermission("return:create");
  const hotels = await db.hotel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const hotel = hotelId ? await db.hotel.findUnique({ where: { id: hotelId } }) : null;
  const rows = hotel ? await hotelHoldings(hotel.id) : [];
  return { hotels, hotel, rows };
}
