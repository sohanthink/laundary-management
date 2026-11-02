import "server-only";
import type { LedgerType, Prisma } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { dueFromSums, type TypeSums } from "@/server/ledger";

type Client = Tx | typeof db;

/** Sums of ACTIVE entries per hotel and type. */
export async function getSumsByHotel(
  client: Client,
  where: Prisma.LedgerEntryWhereInput = {},
): Promise<Map<string, TypeSums>> {
  const rows = await client.ledgerEntry.groupBy({
    by: ["hotelId", "type"],
    where: { status: "ACTIVE", ...where },
    _sum: { amount: true },
  });
  const result = new Map<string, TypeSums>();
  for (const row of rows) {
    const sums = result.get(row.hotelId) ?? {};
    sums[row.type as LedgerType] = row._sum.amount ?? 0;
    result.set(row.hotelId, sums);
  }
  return result;
}

/** Current due per hotel. Hotels with no entries are missing from the map (due 0). */
export async function getDueByHotel(client: Client, hotelIds?: string[]) {
  const sums = await getSumsByHotel(client, hotelIds ? { hotelId: { in: hotelIds } } : {});
  const result = new Map<string, number>();
  for (const [hotelId, s] of sums) result.set(hotelId, dueFromSums(s));
  return result;
}

export async function getDue(client: Client, hotelId: string) {
  return (await getDueByHotel(client, [hotelId])).get(hotelId) ?? 0;
}
