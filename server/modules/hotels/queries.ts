import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue, getDueByHotel } from "@/server/modules/ledger/core";
import { buildStatement, type StatementRange } from "@/server/modules/ledger/statement";
import { activePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking } from "@/server/modules/tracking/core";

export async function getActiveHotelOptions() {
  await requirePermission("admin:access");
  return db.hotel.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, customer: { select: { user: { select: { name: true } } } } },
  });
}

/** Hotels for the big chooser on Send / Collect: name, owner, place and current due. */
export async function getHotelChooserOptions() {
  await requirePermission("admin:access");
  const [hotels, dues] = await Promise.all([
    db.hotel.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        customer: { select: { phone: true, user: { select: { name: true } } } },
      },
    }),
    getDueByHotel(db),
  ]);
  return hotels.map((h) => ({
    id: h.id,
    name: h.name,
    location: h.location,
    owner: h.customer.user.name,
    phone: h.phone ?? h.customer.phone,
    due: dues.get(h.id) ?? 0,
  }));
}

export type HotelOption = Awaited<ReturnType<typeof getHotelChooserOptions>>[number];

/** Everything shown on a hotel profile. No auth check (shared by admin and owner wrappers). */
export async function loadHotelProfile(hotelId: string, range: StatementRange) {
  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
    include: { customer: { include: { user: true } } },
  });
  if (!hotel) return null;

  const [prices, productTracks, itemTracks, due, statement, sends] = await Promise.all([
    activePrices(db, hotelId),
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

  const products = await db.product.findMany({
    where: { id: { in: productTracks.map((t) => t.productId) } },
    select: { id: true, name: true, photoPath: true },
  });
  const product = new Map(products.map((p) => [p.id, p]));

  return {
    hotel,
    prices,
    tracking: productTracks
      .map((t) => ({
        ...t,
        name: product.get(t.productId)?.name ?? "",
        photoPath: product.get(t.productId)?.photoPath ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    itemTracking: itemTracks,
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
