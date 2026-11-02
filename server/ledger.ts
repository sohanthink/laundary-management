import type { LedgerType } from "@prisma/client";

export type LedgerLike = { type: LedgerType; amount: number };

/** How an entry changes the due: charges add, payments subtract, adjustments are signed. */
export function signedAmount(entry: LedgerLike): number {
  switch (entry.type) {
    case "CHARGE":
      return entry.amount;
    case "PAYMENT":
      return -entry.amount;
    case "ADJUSTMENT":
      return entry.amount;
  }
}

export function dueOf(entries: LedgerLike[]): number {
  return entries.reduce((sum, e) => sum + signedAmount(e), 0);
}

/** Adds a running "due after" balance to each entry, like a bank statement. */
export function withRunningBalance<T extends LedgerLike>(
  entries: T[],
  opening: number,
): (T & { balance: number })[] {
  let balance = opening;
  return entries.map((entry) => {
    balance += signedAmount(entry);
    return { ...entry, balance };
  });
}

export type TypeSums = Partial<Record<LedgerType, number>>;

/** Due from grouped sums (as returned by a groupBy on type). */
export function dueFromSums(sums: TypeSums): number {
  return (sums.CHARGE ?? 0) - (sums.PAYMENT ?? 0) + (sums.ADJUSTMENT ?? 0);
}
