import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices, activeServicePrices } from "@/server/modules/prices/queries";
import { getItemTracking, getProductTracking, lastChargedPrices } from "@/server/modules/tracking/core";

export async function getCollectScreen(hotelId: string | undefined) {
  await requirePermission("return:create");
  const empty = { hotel: null, rows: [], itemRows: [], due: 0 };
  if (!hotelId) return empty;

  const hotel = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) return empty;

  const [tracks, itemTracks, servicePrices, deal, lastPrices, due] = await Promise.all([
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
    activeServicePrices(db, hotelId),
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

  const withUs = new Map(itemTracks.map((t) => [t.serviceItemId, t.withUs]));
  const itemRows = servicePrices
    .filter((p) => p.serviceItem.isActive)
    .map((p) => ({ serviceItemId: p.serviceItemId, name: p.serviceItem.name, withUs: withUs.get(p.serviceItemId) ?? 0 }));

  return { hotel, rows, itemRows, due };
}
