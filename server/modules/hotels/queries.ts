import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDue } from "@/server/modules/ledger/core";
import { buildStatement, type StatementRange } from "@/server/modules/ledger/statement";
import { activePrices, activeServicePrices } from "@/server/modules/prices/queries";
import { hotelHoldings } from "@/server/modules/returns/queries";

/** Everything shown on a hotel profile. No auth check (shared by admin and owner wrappers). */
export async function loadHotelProfile(hotelId: string, range: StatementRange) {
  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
    include: { customer: { include: { user: true } } },
  });
  if (!hotel) return null;

  const [prices, servicePrices, holdings, due, statement, sends, serviceOrders] = await Promise.all([
    activePrices(db, hotelId),
    activeServicePrices(db, hotelId),
    hotelHoldings(hotelId),
    getDue(db, hotelId),
    buildStatement(hotelId, range),
    db.send.findMany({
      where: { hotelId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { _count: { select: { lines: true } } },
    }),
    db.serviceOrder.findMany({
      where: { hotelId },
      orderBy: { receivedAt: "desc" },
      take: 10,
      include: { lines: { include: { serviceItem: true } } },
    }),
  ]);

  return { hotel, prices, servicePrices, holdings, due, statement, sends, serviceOrders };
}

export async function getHotelProfile(hotelId: string, range: StatementRange) {
  await requirePermission("admin:access");
  return loadHotelProfile(hotelId, range);
}

export type HotelProfile = NonNullable<Awaited<ReturnType<typeof loadHotelProfile>>>;
