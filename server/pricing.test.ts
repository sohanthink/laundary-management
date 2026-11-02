import { describe, expect, it } from "vitest";
import { toPoisha } from "./money";
import { agreedPrice, calculateSend, describeDiscount, finalUnitPrice } from "./pricing";

describe("agreedPrice", () => {
  it("applies a percent discount", () => {
    expect(agreedPrice(2000, "PERCENT", 1000)).toBe(1800); // 20 tk - 10% = 18 tk
  });

  it("applies a flat discount", () => {
    expect(agreedPrice(3000, "FLAT", 500)).toBe(2500); // 30 tk - 5 tk = 25 tk
  });

  it("keeps the base price with no discount", () => {
    expect(agreedPrice(1500, "NONE", 0)).toBe(1500);
    expect(agreedPrice(1500, "PERCENT", 0)).toBe(1500);
  });

  it("never goes below zero", () => {
    expect(agreedPrice(1000, "FLAT", 5000)).toBe(0);
    expect(agreedPrice(1000, "PERCENT", 15000)).toBe(0);
  });

  it("rounds to the nearest poisha", () => {
    expect(agreedPrice(999, "PERCENT", 250)).toBe(974); // 9.99 - 2.5% = 9.74025
  });
});

describe("finalUnitPrice", () => {
  it("subtracts the extra discount but not below zero", () => {
    expect(finalUnitPrice(1800, 200)).toBe(1600);
    expect(finalUnitPrice(1800, 5000)).toBe(0);
    expect(finalUnitPrice(1800, -100)).toBe(1800);
  });
});

describe("calculateSend", () => {
  it("matches the example send screen", () => {
    const result = calculateSend(
      [
        { basePrice: toPoisha("20"), agreedPrice: toPoisha("18"), extraPerPiece: toPoisha("2"), quantity: 50 },
        { basePrice: toPoisha("30"), agreedPrice: toPoisha("25"), extraPerPiece: 0, quantity: 30 },
        { basePrice: toPoisha("15"), agreedPrice: toPoisha("15"), extraPerPiece: 0, quantity: 0 },
      ],
      toPoisha("50"),
    );
    expect(result.lines.map((l) => l.lineTotal)).toEqual([80000, 75000, 0]);
    expect(result.subtotal).toBe(155000);
    expect(result.total).toBe(150000);
    expect(result.agreedDiscountTotal).toBe(10000 + 15000);
    expect(result.extraDiscountTotal).toBe(10000 + 5000);
  });

  it("caps the whole-send discount at the subtotal", () => {
    const result = calculateSend(
      [{ basePrice: 1000, agreedPrice: 1000, extraPerPiece: 0, quantity: 1 }],
      5000,
    );
    expect(result.wholeDiscount).toBe(1000);
    expect(result.total).toBe(0);
  });
});

describe("describeDiscount", () => {
  it("formats each type", () => {
    expect(describeDiscount("PERCENT", 1000)).toBe("10%");
    expect(describeDiscount("FLAT", 500)).toBe("5.00 tk off");
    expect(describeDiscount("NONE", 0)).toBe("None");
  });
});
