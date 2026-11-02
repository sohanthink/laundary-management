import type { StockState } from "@prisma/client";

export type Buckets = {
  AVAILABLE: number;
  AT_HOTEL: number;
  WASHING: number;
  WRITTEN_OFF: number;
};

export type MovementSum = {
  fromState: StockState;
  toState: StockState;
  quantity: number;
};

export function emptyBuckets(): Buckets {
  return { AVAILABLE: 0, AT_HOTEL: 0, WASHING: 0, WRITTEN_OFF: 0 };
}

/** Each bucket = everything moved into it minus everything moved out of it. */
export function computeBuckets(movements: MovementSum[]): Buckets {
  const buckets = emptyBuckets();
  for (const m of movements) {
    if (m.toState !== "NONE") buckets[m.toState] += m.quantity;
    if (m.fromState !== "NONE") buckets[m.fromState] -= m.quantity;
  }
  return buckets;
}

/** Pieces you still own (excluding lost or damaged ones). */
export function totalOwned(b: Buckets) {
  return b.AVAILABLE + b.AT_HOTEL + b.WASHING;
}

export type Inflow = { date: Date; quantity: number };
export type Outstanding = { date: Date; quantity: number };

/**
 * First in, first out: returned pieces are matched against the oldest sends.
 * Returns the sends (or parts of them) that are still at the hotel.
 */
export function fifoOutstanding(inflows: Inflow[], totalOut: number): Outstanding[] {
  const sorted = [...inflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  let remainingOut = totalOut;
  const result: Outstanding[] = [];
  for (const inflow of sorted) {
    const consumed = Math.min(inflow.quantity, Math.max(remainingOut, 0));
    remainingOut -= consumed;
    const left = inflow.quantity - consumed;
    if (left > 0) result.push({ date: inflow.date, quantity: left });
  }
  return result;
}
