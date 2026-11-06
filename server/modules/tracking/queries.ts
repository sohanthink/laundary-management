import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getItemTracking, getProductTracking } from "./core";

export async function getTrackingPage(hotelId?: string) {
  await requirePermission("report:view");
  const [hotels, products, items, productTracks, itemTracks, recent, recentItems] = await Promise.all([
    db.hotel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({ select: { id: true, name: true } }),
    db.serviceItem.findMany({ select: { id: true, name: true } }),
    getProductTracking(db, hotelId),
    getItemTracking(db, hotelId),
    db.stockMovement.findMany({
      where: { hotelId: hotelId ?? { not: null }, type: { in: ["SEND", "SEND_VOID", "RETURN", "REJECT"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { product: true, hotel: true },
    }),
    db.hotelItemMovement.findMany({
      where: hotelId ? { hotelId } : {},
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { serviceItem: true, hotel: true, send: { select: { status: true } } },
    }),
  ]);

  const hotelName = new Map(hotels.map((h) => [h.id, h.name]));
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const byHotel = (a: { hotelId: string }, b: { hotelId: string }) =>
    (hotelName.get(a.hotelId) ?? "").localeCompare(hotelName.get(b.hotelId) ?? "");

  return {
    hotels,
    products: productTracks
      .map((t) => ({ ...t, hotelName: hotelName.get(t.hotelId) ?? "", productName: productName.get(t.productId) ?? "" }))
      .sort(byHotel),
    items: itemTracks
      .map((t) => ({ ...t, hotelName: hotelName.get(t.hotelId) ?? "", itemName: itemName.get(t.serviceItemId) ?? "" }))
      .sort(byHotel),
    recent,
    recentItems,
  };
}
