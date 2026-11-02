import "server-only";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices } from "@/server/modules/prices/queries";
import { bucketsFor, getBucketsByProduct } from "@/server/modules/stock/core";

export async function getSendScreen(hotelId: string | undefined) {
  await requirePermission("send:create");
  const hotels = await db.hotel.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (!hotelId) return { hotels, hotel: null, rows: [], due: 0 };

  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return { hotels, hotel: null, rows: [], due: 0 };

  const [prices, due] = await Promise.all([activePrices(db, hotelId), getDue(db, hotelId)]);
  const buckets = await getBucketsByProduct(db, { productIds: prices.map((p) => p.productId) });

  const rows = prices
    .filter((p) => p.product.isActive)
    .map((p) => ({
      productId: p.productId,
      name: p.product.name,
      category: p.product.category.name,
      photoPath: p.product.photoPath,
      basePrice: p.product.basePrice,
      agreedPrice: p.agreedPrice,
      available: bucketsFor(buckets, p.productId).AVAILABLE,
    }));

  return { hotels, hotel, rows, due };
}

const sendInclude = {
  hotel: { include: { customer: { include: { user: true } } } },
  lines: { include: { product: true } },
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
    include: { hotel: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: filter.take ?? 50,
  });
}
