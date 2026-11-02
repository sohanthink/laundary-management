import "server-only";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { activeServicePrices } from "@/server/modules/prices/queries";

const orderInclude = {
  hotel: { include: { customer: { include: { user: true } } } },
  lines: { include: { serviceItem: true } },
} satisfies Prisma.ServiceOrderInclude;

export type ServiceOrderWithDetails = Prisma.ServiceOrderGetPayload<{ include: typeof orderInclude }>;

/** No auth check (internal). */
export function findServiceOrder(orderId: string) {
  return db.serviceOrder.findUnique({ where: { id: orderId }, include: orderInclude });
}

export async function getServiceOrder(orderId: string) {
  await requirePermission("service:manage");
  const order = await findServiceOrder(orderId);
  if (!order) return null;
  const prices = new Map(
    (await activeServicePrices(db, order.hotelId)).map((p) => [p.serviceItemId, p.price]),
  );
  return { order, currentPrices: prices };
}

export async function getServicesScreen(hotelId: string | undefined) {
  await requirePermission("service:manage");
  const [hotels, openOrders, recentDelivered] = await Promise.all([
    db.hotel.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.serviceOrder.findMany({
      where: { status: { in: ["RECEIVED", "WASHED"] } },
      include: { hotel: true, lines: { include: { serviceItem: true } } },
      orderBy: { receivedAt: "asc" },
    }),
    db.serviceOrder.findMany({
      where: { status: { in: ["DELIVERED", "CANCELLED"] } },
      include: { hotel: true, lines: { include: { serviceItem: true } } },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
  ]);
  const hotel = hotelId ? await db.hotel.findUnique({ where: { id: hotelId } }) : null;
  const prices = hotel ? await activeServicePrices(db, hotel.id) : [];
  return { hotels, hotel, prices, openOrders, recentDelivered };
}

export async function getServiceItems() {
  await requirePermission("service:manage");
  return db.serviceItem.findMany({ orderBy: { name: "asc" } });
}
