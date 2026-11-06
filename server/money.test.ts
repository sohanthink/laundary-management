import { describe, expect, it } from "vitest";
import { formatMoney, toCents, toMoneyInput } from "./money";

describe("money", () => {
  it("shows dot decimals and comma thousands", () => {
    expect(formatMoney(1500)).toBe("15.00 €");
    expect(formatMoney(150000)).toBe("1,500.00 €");
    expect(formatMoney(-3250)).toBe("-32.50 €");
  });

  it("accepts a dot or a comma when typing", () => {
    expect(toCents("15")).toBe(1500);
    expect(toCents("15.5")).toBe(1550);
    expect(toCents("15,50")).toBe(1550);
  });

  it("puts amounts back into inputs with a dot", () => {
    expect(toMoneyInput(1850)).toBe("18.50");
    expect(toMoneyInput(2000)).toBe("20");
  });
});
