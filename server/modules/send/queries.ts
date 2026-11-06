import "server-only";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking, lastWashingPrices } from "@/server/modules/tracking/core";

export async function getSendScreen(hotelId: string | undefined) {
  await requirePermission("send:create");
  const empty = { hotel: null, rows: [], itemRows: [], products: [], due: 0 };
  if (!hotelId) return empty;

  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return empty;

  const [prices, due, productTracks, itemTracks, washPrices, products] = await Promise.all([
    activePrices(db, hotelId),
    getDue(db, hotelId),
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
    lastWashingPrices(db, hotelId),
    db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const atHotel = new Map(productTracks.map((t) => [t.productId, t.atHotel]));

  const rows = prices
    .filter((p) => p.product.isActive)
    .map((p) => ({
      productId: p.productId,
      name: p.product.name,
      category: p.product.category.name,
      photoPath: p.product.photoPath,
      basePrice: p.product.basePrice,
      agreedPrice: p.agreedPrice,
      atHotel: atHotel.get(p.productId) ?? 0,
    }));

  // The hotel's own pieces we are holding, ready to deliver back washed.
  const itemRows = itemTracks
    .filter((t) => t.withUs > 0)
    .map((t) => ({
      key: t.key,
      productId: t.productId,
      name: t.name,
      withUs: t.withUs,
      lastPrice: washPrices.get(t.key) ?? null,
    }));

  return { hotel, rows, itemRows, products, due };
}

const sendInclude = {
  hotel: { include: { customer: { include: { user: true } } } },
  lines: { include: { product: true } },
  itemLines: true,
  ledgerEntries: true,
} satisfies Prisma.SendInclude;

export type SendWithDetails = Prisma.SendGetPayload<{ include: typeof sendInclude }>;

/** No auth check: callers must check access (admin or owning hotel owner). */
export function findSend(sendId: string) {
  return db.send.findUnique({ where: { id: sendId }, include: sendInclude });
}

export async function getSend(sendId: string) {
  await requirePermission("admin:access");
  return findSend(sendId);
}

export async function listSends(filter: { hotelId?: string; take?: number } = {}) {
  await requirePermission("admin:access");
  return db.send.findMany({
    where: filter.hotelId ? { hotelId: filter.hotelId } : {},
    include: { hotel: true, _count: { select: { lines: true, itemLines: true } } },
    orderBy: { createdAt: "desc" },
    take: filter.take ?? 50,
  });
}
