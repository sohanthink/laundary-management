import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking, itemKey, lastChargedPrices } from "@/server/modules/tracking/core";

export async function getCollectScreen(hotelId: string | undefined) {
  await requirePermission("return:create");
  const empty = { hotel: null, rows: [], itemRows: [], due: 0 };
  if (!hotelId) return empty;

  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return empty;

  const [tracks, itemTracks, allProducts, deal, lastPrices, due] = await Promise.all([
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, photoPath: true },
    }),
    activePrices(db, hotelId),
    lastChargedPrices(db, hotelId),
    getDue(db, hotelId),
  ]);

  const held = tracks.filter((t) => t.atHotel > 0);
  const products = await db.product.findMany({
    where: { id: { in: held.map((t) => t.productId) } },
    select: { id: true, name: true, photoPath: true, category: { select: { name: true } } },
  });
  const product = new Map(products.map((p) => [p.id, p]));
  const agreed = new Map(deal.map((p) => [p.productId, p.agreedPrice]));

  const rows = held
    .map((t) => ({
      productId: t.productId,
      name: product.get(t.productId)?.name ?? "",
      category: product.get(t.productId)?.category.name ?? "",
      photoPath: product.get(t.productId)?.photoPath ?? null,
      atHotel: t.atHotel,
      creditPrice: lastPrices.get(t.productId) ?? agreed.get(t.productId) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Tiles for picking up the hotel's own pieces: all our product types, plus
  // "Other" names already used for this hotel. New "Other" names are typed on screen.
  const withUs = new Map(itemTracks.map((t) => [t.key, t.withUs]));
  const itemRows = [
    ...allProducts.map((p) => ({
      key: itemKey(p.id, p.name),
      productId: p.id as string | null,
      name: p.name,
      photoPath: p.photoPath,
      withUs: withUs.get(itemKey(p.id, p.name)) ?? 0,
    })),
    ...itemTracks
      .filter((t) => !t.productId)
      .map((t) => ({ key: t.key, productId: null, name: t.name, photoPath: null, withUs: t.withUs })),
  ];

  return { hotel, rows, itemRows, due };
}
