import "server-only";
import type { MovementType } from "@prisma/client";
import { db, type Tx } from "@/server/db";

type Client = Tx | typeof db;

export type ProductTrack = {
  hotelId: string;
  productId: string;
  sent: number;
  returned: number;
  rejected: number;
  lost: number;
  atHotel: number;
};

/** Sent / returned / rejected / still at the hotel, per hotel and product. No auth check. */
export async function getProductTracking(client: Client, hotelId?: string): Promise<ProductTrack[]> {
  const rows = await client.stockMovement.groupBy({
    by: ["hotelId", "productId", "type"],
    where: { hotelId: hotelId ?? { not: null } },
    _sum: { quantity: true },
  });

  const byKey = new Map<string, ProductTrack>();
  for (const row of rows) {
    if (!row.hotelId) continue;
    const key = `${row.hotelId}:${row.productId}`;
    const track = byKey.get(key) ?? {
      hotelId: row.hotelId,
      productId: row.productId,
      sent: 0,
      returned: 0,
      rejected: 0,
      lost: 0,
      atHotel: 0,
    };
    const qty = row._sum.quantity ?? 0;
    const type: MovementType = row.type;
    if (type === "SEND") track.sent += qty;
    if (type === "SEND_VOID") track.sent -= qty;
    if (type === "RETURN") track.returned += qty;
    if (type === "REJECT") track.rejected += qty;
    if (type === "LOST" || type === "DAMAGED") track.lost += qty;
    byKey.set(key, track);
  }

  return [...byKey.values()]
    .map((t) => ({ ...t, atHotel: t.sent - t.returned - t.rejected - t.lost }))
    .filter((t) => t.sent > 0 || t.atHotel !== 0);
}

/** Identifies one kind of hotel-owned item: a product type, or a free name for "Other". */
export function itemKey(productId: string | null, itemName: string) {
  return productId ? `p:${productId}` : `n:${itemName.trim().toLowerCase()}`;
}

export type ItemTrack = {
  hotelId: string;
  key: string;
  productId: string | null;
  name: string;
  collected: number;
  delivered: number;
  withUs: number;
};

/** Hotel's own items: collected for washing / delivered back / still with us. No auth check. */
export async function getItemTracking(client: Client, hotelId?: string): Promise<ItemTrack[]> {
  const rows = await client.hotelItemMovement.groupBy({
    by: ["hotelId", "productId", "itemName", "type"],
    where: {
      ...(hotelId ? { hotelId } : {}),
      OR: [{ sendId: null }, { send: { status: "ACTIVE" } }],
    },
    _sum: { quantity: true },
  });

  const productIds = [...new Set(rows.map((r) => r.productId).filter((v): v is string => !!v))];
  const products = productIds.length
    ? await client.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const byKey = new Map<string, ItemTrack>();
  for (const row of rows) {
    const key = itemKey(row.productId, row.itemName);
    const mapKey = `${row.hotelId}:${key}`;
    const track = byKey.get(mapKey) ?? {
      hotelId: row.hotelId,
      key,
      productId: row.productId,
      name: (row.productId && productName.get(row.productId)) || row.itemName,
      collected: 0,
      delivered: 0,
      withUs: 0,
    };
    const qty = row._sum.quantity ?? 0;
    if (row.type === "COLLECTED") track.collected += qty;
    else track.delivered += qty;
    byKey.set(mapKey, track);
  }
  return [...byKey.values()]
    .map((t) => ({ ...t, withUs: t.collected - t.delivered }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Last washing price per piece charged to this hotel for each of its own item kinds. */
export async function lastWashingPrices(client: Client, hotelId: string) {
  const rows = await client.hotelItemMovement.findMany({
    where: { hotelId, type: "DELIVERED", send: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { productId: true, itemName: true, unitPriceSnapshot: true },
    take: 500,
  });
  const prices = new Map<string, number>();
  for (const r of rows) {
    const key = itemKey(r.productId, r.itemName);
    if (!prices.has(key)) prices.set(key, r.unitPriceSnapshot);
  }
  return prices;
}

/** Last price this hotel was charged per piece for each product (for crediting rejects). */
export async function lastChargedPrices(client: Client, hotelId: string) {
  const lines = await client.sendLine.findMany({
    where: { send: { hotelId, status: "ACTIVE" } },
    orderBy: { send: { createdAt: "desc" } },
    select: { productId: true, finalUnitPrice: true },
  });
  const prices = new Map<string, number>();
  for (const line of lines) {
    if (!prices.has(line.productId)) prices.set(line.productId, line.finalUnitPrice);
  }
  return prices;
}
