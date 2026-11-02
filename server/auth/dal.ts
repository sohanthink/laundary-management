import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { can, homePathFor, type Permission } from "./permissions";
import { readSessionUser } from "./session";

/** Current session, read once per request. */
export const getSession = cache(readSessionUser);

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

/** Logged-in user or redirect to /login. Also enforces the first-login password change. */
export async function requireUser(options: { allowPasswordChange?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !options.allowPasswordChange) {
    redirect("/change-password");
  }
  return user;
}

/** Use at the top of every page, query and Server Action. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user, permission)) redirect(homePathFor(user));
  return user;
}

/** Hotel ids the logged-in owner may see. Never trust a hotel id from the URL alone. */
export const getOwnerHotelIds = cache(async (userId: string) => {
  const hotels = await db.hotel.findMany({
    where: { customer: { userId } },
    select: { id: true },
  });
  return hotels.map((h) => h.id);
});

/** Throws a redirect unless the logged-in owner owns this hotel. */
export async function requireOwnHotel(hotelId: string) {
  const user = await requirePermission("own:hotel:view");
  const hotelIds = await getOwnerHotelIds(user.id);
  if (!hotelIds.includes(hotelId)) redirect("/portal");
  return user;
}
