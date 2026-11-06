// Pure price math shared by the server and the Send screen. All values in poisha.

import { formatTk, toTkInput } from "./money";

export type DiscountType = "NONE" | "PERCENT" | "FLAT";

/**
 * Agreed price for a hotel. PERCENT value is in basis points (1000 = 10%),
 * FLAT value is poisha off per piece. Never below 0.
 */
export function agreedPrice(basePrice: number, type: DiscountType, value: number): number {
  switch (type) {
    case "NONE":
      return basePrice;
    case "PERCENT":
      return Math.max(0, Math.round((basePrice * (10000 - value)) / 10000));
    case "FLAT":
      return Math.max(0, basePrice - value);
  }
}

export function describeDiscount(type: DiscountType, value: number): string {
  if (type === "PERCENT") return `${toTkInput(value)}%`;
  if (type === "FLAT") return `${formatTk(value)} off`;
  return "None";
}

export function finalUnitPrice(agreed: number, extraPerPiece: number): number {
  return Math.max(0, agreed - Math.max(0, extraPerPiece));
}

export type SendLineInput = {
  basePrice: number;
  agreedPrice: number;
  extraPerPiece: number;
  quantity: number;
};

export type SendLineResult = SendLineInput & {
  /** Extra discount actually applied per piece (cannot exceed the agreed price). */
  appliedExtra: number;
  finalUnitPrice: number;
  lineTotal: number;
};

/** Hotel's own items washed and delivered back with this send. */
export type ItemLineInput = { price: number; quantity: number };

export type SendTotals = {
  lines: SendLineResult[];
  itemLines: (ItemLineInput & { lineTotal: number })[];
  productsSubtotal: number;
  itemsSubtotal: number;
  subtotal: number;
  wholeDiscount: number;
  total: number;
  /** Discount from the deal: (base - agreed) x qty */
  agreedDiscountTotal: number;
  /** One-off discount on this send: per-piece extras + whole-send discount */
  extraDiscountTotal: number;
};

export function calculateSend(
  lines: SendLineInput[],
  wholeDiscount: number,
  items: ItemLineInput[] = [],
): SendTotals {
  const results = lines.map((line) => {
    const final = finalUnitPrice(line.agreedPrice, line.extraPerPiece);
    return {
      ...line,
      appliedExtra: line.agreedPrice - final,
      finalUnitPrice: final,
      lineTotal: final * line.quantity,
    };
  });
  const itemLines = items.map((item) => ({ ...item, lineTotal: item.price * item.quantity }));
  const productsSubtotal = results.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemsSubtotal = itemLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const subtotal = productsSubtotal + itemsSubtotal;
  const whole = Math.min(Math.max(0, wholeDiscount), subtotal);
  return {
    lines: results,
    itemLines,
    productsSubtotal,
    itemsSubtotal,
    subtotal,
    wholeDiscount: whole,
    total: subtotal - whole,
    agreedDiscountTotal: results.reduce(
      (sum, l) => sum + Math.max(0, l.basePrice - l.agreedPrice) * l.quantity,
      0,
    ),
    extraDiscountTotal: results.reduce((sum, l) => sum + l.appliedExtra * l.quantity, 0) + whole,
  };
}
