import type {
  LedgerType,
  MovementType,
  PaymentMethod,
  ServiceStatus,
  StockState,
} from "@prisma/client";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  STOCK_IN: "Stock in",
  SEND: "Sent",
  SEND_VOID: "Send voided",
  RETURN: "Returned",
  WASHED: "Washed",
  LOST: "Lost",
  DAMAGED: "Damaged",
};

export const STATE_LABEL: Record<StockState, string> = {
  NONE: "-",
  AVAILABLE: "Available",
  AT_HOTEL: "At hotel",
  WASHING: "Washing",
  WRITTEN_OFF: "Written off",
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
};

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  RECEIVED: "Received",
  WASHED: "Washed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
