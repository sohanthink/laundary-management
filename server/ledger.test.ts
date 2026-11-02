import { describe, expect, it } from "vitest";
import { dueFromSums, dueOf, withRunningBalance } from "./ledger";

describe("ledger", () => {
  const entries = [
    { type: "CHARGE" as const, amount: 100000 },
    { type: "CHARGE" as const, amount: 30000 },
    { type: "PAYMENT" as const, amount: 80000 },
    { type: "ADJUSTMENT" as const, amount: -5000 },
    { type: "CHARGE" as const, amount: 75000 },
  ];

  it("computes the due", () => {
    expect(dueOf(entries)).toBe(120000);
  });

  it("adds a running balance starting from the opening due", () => {
    const rows = withRunningBalance(entries, 2000);
    expect(rows.map((r) => r.balance)).toEqual([102000, 132000, 52000, 47000, 122000]);
  });

  it("matches the grouped-sum formula", () => {
    expect(dueFromSums({ CHARGE: 205000, PAYMENT: 80000, ADJUSTMENT: -5000 })).toBe(120000);
    expect(dueFromSums({})).toBe(0);
  });
});
