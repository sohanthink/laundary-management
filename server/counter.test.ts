import { describe, expect, it } from "vitest";
import { applyPhoneKey, counterUnitPrice, isValidPhone, normalizePhone } from "./counter";

describe("counter prices", () => {
  it("charges the full price for wash + iron", () => {
    expect(counterUnitPrice(400, "WASH_IRON")).toBe(400);
  });

  it("charges half for iron only, rounded to the cent", () => {
    expect(counterUnitPrice(400, "IRON_ONLY")).toBe(200);
    expect(counterUnitPrice(350, "IRON_ONLY")).toBe(175);
    expect(counterUnitPrice(355, "IRON_ONLY")).toBe(178);
  });
});

describe("phone numbers", () => {
  it("keeps only digits and a leading plus", () => {
    expect(normalizePhone(" +39 333 123-4567 ")).toBe("+393331234567");
    expect(normalizePhone("333.123.4567")).toBe("3331234567");
  });

  it("checks the length", () => {
    expect(isValidPhone("3331234567")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("types a phone number from the number pad", () => {
    expect(applyPhoneKey("", "+")).toBe("+");
    expect(applyPhoneKey("33", "+")).toBe("33");
    expect(applyPhoneKey("+39", "3")).toBe("+393");
    expect(applyPhoneKey("+393", "back")).toBe("+39");
    expect(applyPhoneKey("+393", "clear")).toBe("");
    expect(applyPhoneKey("+39", ".")).toBe("+39");
    expect(applyPhoneKey("123456789012345", "6")).toBe("123456789012345");
  });
});
