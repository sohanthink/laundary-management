import "server-only";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices, activeServicePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking } from "@/server/modules/tracking/core";

export async function getSendScreen(hotelId: string | undefined) {
  await requirePermission("send:create");
  const empty = { hotel: null, rows: [], itemRows: [], due: 0 };
  if (!hotelId) return empty;

  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return empty;

  const [prices, servicePrices, due, productTracks, itemTracks] = await Promise.all([
    activePrices(db, hotelId),
    activeServicePrices(db, hotelId),
    getDue(db, hotelId),
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
  ]);
  const atHotel = new Map(productTracks.map((t) => [t.productId, t.atHotel]));
  const withUs = new Map(itemTracks.map((t) => [t.serviceItemId, t.withUs]));

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

  const itemRows = servicePrices
    .filter((p) => p.serviceItem.isActive)
    .map((p) => ({
      serviceItemId: p.serviceItemId,
      name: p.serviceItem.name,
      price: p.price,
      withUs: withUs.get(p.serviceItemId) ?? 0,
    }));

  return { hotel, rows, itemRows, due };
}

const sendInclude = {
  hotel: { include: { customer: { include: { user: true } } } },
  lines: { include: { product: true } },
  itemLines: { include: { serviceItem: true } },
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
