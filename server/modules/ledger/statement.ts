import "server-only";
import { db } from "@/server/db";
import { endOfDhakaDay, startOfDhakaDay } from "@/server/dates";
import { dueFromSums, withRunningBalance } from "@/server/ledger";
import { getSumsByHotel } from "./core";

export type StatementRange = { from: string; to: string };

/**
 * Bank-statement style view for one hotel. No auth check: wrap it in an
 * admin or owner query. Voided entries are listed but don't count.
 */
export async function buildStatement(hotelId: string, range: StatementRange) {
  const from = startOfDhakaDay(range.from);
  const to = endOfDhakaDay(range.to);

  const [openingSums, entries, closingSums] = await Promise.all([
    getSumsByHotel(db, { hotelId, date: { lt: from } }),
    db.ledgerEntry.findMany({
      where: { hotelId, date: { gte: from, lt: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { send: { select: { id: true } }, serviceOrder: { select: { id: true } } },
    }),
    getSumsByHotel(db, { hotelId, date: { lt: to } }),
  ]);

  const opening = dueFromSums(openingSums.get(hotelId) ?? {});
  const active = entries.filter((e) => e.status === "ACTIVE");
  const withBalance = withRunningBalance(active, opening);
  const balanceById = new Map(withBalance.map((e) => [e.id, e.balance]));

  const sum = (type: "CHARGE" | "PAYMENT" | "ADJUSTMENT") =>
    active.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);

  return {
    opening,
    closing: dueFromSums(closingSums.get(hotelId) ?? {}),
    charges: sum("CHARGE"),
    payments: sum("PAYMENT"),
    adjustments: sum("ADJUSTMENT"),
    rows: entries.map((e) => ({ ...e, balance: balanceById.get(e.id) ?? null })),
  };
}

export type Statement = Awaited<ReturnType<typeof buildStatement>>;
