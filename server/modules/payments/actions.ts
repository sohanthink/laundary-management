"use server";

import { after } from "next/server";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { db } from "@/server/db";
import { startOfLocalDay, todayIso } from "@/server/dates";
import { sendEmail } from "@/server/email";
import { id, isoDate, money, optionalText, parseForm, type ActionState } from "@/server/forms";
import { getDue } from "@/server/modules/ledger/core";
import { receiptRecipient } from "@/server/modules/send/receipt";
import { done } from "@/server/modules/shared";
import { paymentReceiptEmail } from "./receipt";

/** Payments dated today keep the exact time so they sort after today's sends. */
function entryDate(iso: string) {
  return iso === todayIso() ? new Date() : startOfLocalDay(iso);
}

const paymentSchema = z.object({
  hotelId: z.string().min(1, "Choose a hotel"),
  amount: money("Amount").refine((v) => v > 0, "Amount must be more than 0"),
  method: z.enum(["CASH", "BANK", "POS", "EMPLOYEE"]),
  date: isoDate,
  note: optionalText,
});

export async function recordPayment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, amount, method, date, note } = parsed.data;

  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
    include: { customer: { include: { user: true } } },
  });
  if (!hotel) return { error: "Hotel not found." };

  const entry = await db.ledgerEntry.create({
    data: { hotelId, type: "PAYMENT", amount, method, date: entryDate(date), note, createdById: user.id },
  });
  await logAudit({ userId: user.id, action: "payment.create", entity: "LedgerEntry", entityId: entry.id, after: entry });

  after(async () => {
    const due = await getDue(db, hotelId);
    await sendEmail({ to: receiptRecipient(hotel), ...paymentReceiptEmail(hotel.name, entry, due) });
  });
  return done((await getT())("Payment recorded for {hotel}. The due was reduced.", { hotel: hotel.name }));
}

const adjustmentSchema = z.object({
  hotelId: id,
  direction: z.enum(["INCREASE", "DECREASE"]),
  amount: money("Amount").refine((v) => v > 0, "Amount must be more than 0"),
  date: isoDate,
  note: z.string().trim().min(3, "Explain why"),
});

/** Manual correction or special discount. Positive increases the due, negative reduces it. */
export async function addAdjustment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(adjustmentSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, direction, amount, date, note } = parsed.data;

  const entry = await db.ledgerEntry.create({
    data: {
      hotelId,
      type: "ADJUSTMENT",
      amount: direction === "INCREASE" ? amount : -amount,
      date: entryDate(date),
      note,
      createdById: user.id,
    },
  });
  await logAudit({ userId: user.id, action: "adjustment.create", entity: "LedgerEntry", entityId: entry.id, after: entry });
  return done("Adjustment added.");
}

const voidSchema = z.object({ id, reason: z.string().trim().min(3, "Give a reason") });

/** Payments and adjustments can be voided. Charges are corrected by voiding the send instead. */
export async function voidLedgerEntry(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.success) return parsed.state;

  const entry = await db.ledgerEntry.findUnique({ where: { id: parsed.data.id } });
  if (!entry) return { error: "Entry not found." };
  if (entry.status === "VOIDED") return { error: "Already voided." };
  if (entry.type === "CHARGE") return { error: "Charges can't be voided here. Void the send or add an adjustment." };
  if (entry.sendId && entry.type === "ADJUSTMENT") return { error: "This adjustment belongs to a voided send." };
  if (entry.invoiceId) {
    return {
      error:
        entry.type === "PAYMENT"
          ? "This payment came from an invoice. Open the invoice and mark it unpaid instead."
          : "This credit is on an invoice. Void the invoice first.",
    };
  }

  const updated = await db.ledgerEntry.update({
    where: { id: entry.id },
    data: { status: "VOIDED", voidReason: parsed.data.reason },
  });
  await logAudit({ userId: user.id, action: "ledger.void", entity: "LedgerEntry", entityId: entry.id, before: entry, after: updated });
  return done("Entry voided. The due was recalculated.");
}
