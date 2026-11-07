import { describe, expect, it } from "vitest";
import { profitSummary } from "./profit";

describe("profitSummary", () => {
  it("adds hotels and walk-in, then subtracts expenses", () => {
    const p = profitSummary({
      hotelEarned: 160000,
      walkInEarned: 15500,
      hotelReceived: 100000,
      walkInReceived: 15500,
      expenses: 40000,
    });
    expect(p.revenue).toBe(175500);
    expect(p.estimatedProfit).toBe(135500);
    expect(p.received).toBe(115500);
    expect(p.cashProfit).toBe(75500);
  });

  it("can be negative when expenses are higher", () => {
    expect(profitSummary({ hotelEarned: 0, walkInEarned: 1000, hotelReceived: 0, walkInReceived: 0, expenses: 5000 }).estimatedProfit).toBe(-4000);
  });
});
