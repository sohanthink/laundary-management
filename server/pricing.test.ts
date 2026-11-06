import { describe, expect, it } from "vitest";
import { toCents } from "./money";
import { agreedPrice, calculateSend, describeDiscount, finalUnitPrice } from "./pricing";

describe("agreedPrice", () => {
  it("applies a percent discount", () => {
    expect(agreedPrice(2000, "PERCENT", 1000)).toBe(1800); // 20 € - 10% = 18 €
  });

  it("applies a flat discount", () => {
    expect(agreedPrice(3000, "FLAT", 500)).toBe(2500); // 30 € - 5 € = 25 €
  });

  it("keeps the base price with no discount", () => {
    expect(agreedPrice(1500, "NONE", 0)).toBe(1500);
    expect(agreedPrice(1500, "PERCENT", 0)).toBe(1500);
  });

  it("never goes below zero", () => {
    expect(agreedPrice(1000, "FLAT", 5000)).toBe(0);
    expect(agreedPrice(1000, "PERCENT", 15000)).toBe(0);
  });

  it("rounds to the nearest cents", () => {
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
        { basePrice: toCents("20"), agreedPrice: toCents("18"), extraPerPiece: toCents("2"), quantity: 50 },
        { basePrice: toCents("30"), agreedPrice: toCents("25"), extraPerPiece: 0, quantity: 30 },
        { basePrice: toCents("15"), agreedPrice: toCents("15"), extraPerPiece: 0, quantity: 0 },
      ],
      toCents("50"),
    );
    expect(result.lines.map((l) => l.lineTotal)).toEqual([80000, 75000, 0]);
    expect(result.subtotal).toBe(155000);
    expect(result.total).toBe(150000);
    expect(result.agreedDiscountTotal).toBe(10000 + 15000);
    expect(result.extraDiscountTotal).toBe(10000 + 5000);
  });

  it("adds the hotel's own washed items to the total", () => {
    const result = calculateSend(
      [{ basePrice: 2000, agreedPrice: 1800, extraPerPiece: 0, quantity: 10 }],
      1000,
      [{ price: 3000, quantity: 10 }],
    );
    expect(result.productsSubtotal).toBe(18000);
    expect(result.itemsSubtotal).toBe(30000);
    expect(result.subtotal).toBe(48000);
    expect(result.total).toBe(47000);
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
    expect(describeDiscount("FLAT", 500)).toBe("5,00 € off");
    expect(describeDiscount("NONE", 0)).toBe("None");
  });
});
