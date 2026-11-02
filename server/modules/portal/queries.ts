import "server-only";
import { getOwnerHotelIds, requireOwnHotel, requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { getDueByHotel } from "@/server/modules/ledger/core";
import type { StatementRange } from "@/server/modules/ledger/statement";
import { loadHotelProfile } from "@/server/modules/hotels/queries";
import { findSend } from "@/server/modules/send/queries";
import { getBucketsByProduct } from "@/server/modules/stock/core";

export async function getOwnerDashboard() {
  const user = await requirePermission("own:hotel:view");
  const hotelIds = await getOwnerHotelIds(user.id);
  const [hotels, dues] = await Promise.all([
    db.hotel.findMany({ where: { id: { in: hotelIds } }, orderBy: { name: "asc" } }),
    getDueByHotel(db, hotelIds),
  ]);
  const held = await Promise.all(
    hotels.map(async (h) => {
      const buckets = await getBucketsByProduct(db, { hotelId: h.id });
      return [...buckets.values()].reduce((s, b) => s + b.AT_HOTEL, 0);
    }),
  );
  const rows = hotels.map((h, i) => ({ hotel: h, due: dues.get(h.id) ?? 0, piecesHeld: held[i] }));
  return { user, rows, totalDue: rows.reduce((s, r) => s + r.due, 0) };
}

export async function getOwnerHotel(hotelId: string, range: StatementRange) {
  await requireOwnHotel(hotelId);
  return loadHotelProfile(hotelId, range);
}

/** Returns the send only if it belongs to one of the owner's hotels. */
export async function getOwnerSend(sendId: string) {
  const user = await requirePermission("own:statement:view");
  const send = await findSend(sendId);
  if (!send) return null;
  const hotelIds = await getOwnerHotelIds(user.id);
  return hotelIds.includes(send.hotelId) ? send : null;
}

export async function getOwnProfile() {
  const user = await requirePermission("own:profile:edit");
  const customer = await db.customer.findUnique({ where: { userId: user.id } });
  return { user, customer };
}
