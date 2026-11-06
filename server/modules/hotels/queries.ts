import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { buildStatement, type StatementRange } from "@/server/modules/ledger/statement";
import { activePrices, activeServicePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking } from "@/server/modules/tracking/core";

export async function getActiveHotelOptions() {
  await requirePermission("admin:access");
  return db.hotel.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, customer: { select: { user: { select: { name: true } } } } },
  });
}

/** Everything shown on a hotel profile. No auth check (shared by admin and owner wrappers). */
export async function loadHotelProfile(hotelId: string, range: StatementRange) {
  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
    include: { customer: { include: { user: true } } },
  });
  if (!hotel) return null;

  const [prices, servicePrices, productTracks, itemTracks, due, statement, sends] = await Promise.all([
    activePrices(db, hotelId),
    activeServicePrices(db, hotelId),
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
    getDue(db, hotelId),
    buildStatement(hotelId, range),
    db.send.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { _count: { select: { lines: true, itemLines: true } } },
    }),
  ]);

  const [products, items] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productTracks.map((t) => t.productId) } },
      select: { id: true, name: true, photoPath: true },
    }),
    db.serviceItem.findMany({
      where: { id: { in: itemTracks.map((t) => t.serviceItemId) } },
      select: { id: true, name: true },
    }),
  ]);
  const product = new Map(products.map((p) => [p.id, p]));
  const itemName = new Map(items.map((i) => [i.id, i.name]));

  return {
    hotel,
    prices,
    servicePrices,
    tracking: productTracks
      .map((t) => ({
        ...t,
        name: product.get(t.productId)?.name ?? "",
        photoPath: product.get(t.productId)?.photoPath ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    itemTracking: itemTracks
      .map((t) => ({ ...t, name: itemName.get(t.serviceItemId) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    due,
    statement,
    sends,
  };
}

export async function getHotelProfile(hotelId: string, range: StatementRange) {
  await requirePermission("admin:access");
  return loadHotelProfile(hotelId, range);
}

export type HotelProfile = NonNullable<Awaited<ReturnType<typeof loadHotelProfile>>>;
