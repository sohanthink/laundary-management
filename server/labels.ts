import type { LedgerType, MovementType, PaymentMethod } from "@prisma/client";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  STOCK_IN: "Stock in",
  SEND: "Sent",
  SEND_VOID: "Send voided",
  RETURN: "Returned",
  REJECT: "Rejected",
  WASHED: "Washed",
  LOST: "Lost",
  DAMAGED: "Damaged",
};

export const LEDGER_LABEL: Record<LedgerType, string> = {
  CHARGE: "Charge",
  PAYMENT: "Payment",
  ADJUSTMENT: "Adjustment",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank",
  EMPLOYEE: "Collected by employee",
  POS: "POS (card)",
};
