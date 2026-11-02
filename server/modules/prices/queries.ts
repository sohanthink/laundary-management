import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db, type Tx } from "@/server/db";

type Client = Tx | typeof db;

/** The hotel's current deal: one active price per product. No auth check (internal). */
export function activePrices(client: Client, hotelId: string) {
  return client.hotelPrice.findMany({
    where: { hotelId, validTo: null },
    include: { product: { include: { category: true } } },
    orderBy: [{ product: { category: { name: "asc" } } }, { product: { name: "asc" } }],
  });
}

export function activeServicePrices(client: Client, hotelId: string) {
  return client.hotelServicePrice.findMany({
    where: { hotelId, validTo: null },
    include: { serviceItem: true },
    orderBy: { serviceItem: { name: "asc" } },
  });
}

export async function getHotelPricePage(hotelId: string) {
  await requirePermission("price:manage");
  const [hotel, prices, products, history] = await Promise.all([
    db.hotel.findUnique({ where: { id: hotelId }, include: { customer: { include: { user: true } } } }),
    activePrices(db, hotelId),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, basePrice: true },
    }),
    db.hotelPrice.findMany({
      where: { hotelId, validTo: { not: null } },
      include: { product: true },
      orderBy: { validTo: "desc" },
      take: 20,
    }),
  ]);
  const inDeal = new Set(prices.map((p) => p.productId));
  return {
    hotel,
    prices,
    addable: products.filter((p) => !inDeal.has(p.id)),
    history,
  };
}
