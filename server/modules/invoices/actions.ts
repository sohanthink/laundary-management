"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { currentYear, startOfLocalDay, todayIso } from "@/server/dates";
import { checkbox, id, isoDate, optionalText, parseForm, type ActionState } from "@/server/forms";
import { BusinessError, done, revalidateAll, SERIALIZABLE, toActionError } from "@/server/modules/shared";
import { buildInvoiceDraft } from "./build";

const createSchema = z
  .object({ hotelId: id, from: isoDate, to: isoDate, note: optionalText })
  .refine((v) => v.from <= v.to, { message: "The start date must be before the end date", path: ["to"] });

export async function createInvoice(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(createSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, from, to, note } = parsed.data;

  let invoiceId: string;
  try {
    invoiceId = await db.$transaction(async (tx) => {
      const draft = await buildInvoiceDraft(tx, hotelId, from, to);
      if (draft.lines.length === 0) throw new BusinessError("Nothing to invoice for this hotel in this period.");

      const year = currentYear();
      const last = await tx.invoice.aggregate({ where: { year }, _max: { number: true } });
      const invoice = await tx.invoice.create({
        data: {
          year,
          number: (last._max.number ?? 0) + 1,
          hotelId,
          periodFrom: draft.from,
          periodTo: draft.to,
          total: draft.total,
          note,
          createdById: user.id,
          lines: { create: draft.lines.map((l, i) => ({ ...l, sortOrder: i })) },
        },
      });
      await tx.send.updateMany({ where: { id: { in: draft.sendIds } }, data: { invoiceId: invoice.id } });
      await tx.ledgerEntry.updateMany({ where: { id: { in: draft.creditIds } }, data: { invoiceId: invoice.id } });
      await logAudit(
        { userId: user.id, action: "invoice.create", entity: "Invoice", entityId: invoice.id, after: { number: invoice.number, year, total: draft.total } },
        tx,
      );
      return invoice.id;
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }

  revalidateAll();
  redirect(`/admin/invoices/${invoiceId}`);
}

const paidSchema = z.object({
  id,
  method: z.enum(["CASH", "BANK", "POS", "EMPLOYEE"]),
  date: isoDate,
  recordPayment: checkbox,
});

/**
 * Marks the invoice paid. By default this also records the payment, so the
 * hotel's due goes down. Untick it if the payment was already entered.
 */
export async function markInvoicePaid(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(paidSchema, formData);
  if (!parsed.success) return parsed.state;
  const { id: invoiceId, method, date, recordPayment } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new BusinessError("Invoice not found.");
      if (invoice.status !== "UNPAID") throw new BusinessError("Only unpaid invoices can be marked paid.");

      const paidAt = date === todayIso() ? new Date() : startOfLocalDay(date);
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt, method } });
      if (recordPayment && invoice.total > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId: invoice.hotelId,
            type: "PAYMENT",
            amount: invoice.total,
            method,
            date: paidAt,
            invoiceId,
            note: `Invoice ${invoice.number}/${invoice.year}`,
            createdById: user.id,
          },
        });
      }
      await logAudit({ userId: user.id, action: "invoice.paid", entity: "Invoice", entityId: invoiceId, after: { method, recordPayment } }, tx);
    });
  } catch (error) {
    return toActionError(error);
  }
  return done("Invoice marked as paid.");
}

/** Undo "paid" (e.g. clicked by mistake). Voids the payment it created. */
export async function markInvoiceUnpaid(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const invoiceId = String(formData.get("id") ?? "");

  try {
    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status !== "PAID") throw new BusinessError("Only paid invoices can be marked unpaid.");
      await tx.ledgerEntry.updateMany({
        where: { invoiceId, type: "PAYMENT", status: "ACTIVE" },
        data: { status: "VOIDED", voidReason: "Invoice marked unpaid" },
      });
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: "UNPAID", paidAt: null, method: null } });
      await logAudit({ userId: user.id, action: "invoice.unpaid", entity: "Invoice", entityId: invoiceId }, tx);
    });
  } catch (error) {
    return toActionError(error);
  }
  return done("Invoice marked as unpaid.");
}

const voidSchema = z.object({ id, reason: z.string().trim().min(3, "Give a reason") });

/** Voids an unpaid invoice. Its sends and credits become free to invoice again. */
export async function voidInvoice(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payment:manage");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: parsed.data.id } });
      if (!invoice) throw new BusinessError("Invoice not found.");
      if (invoice.status !== "UNPAID") throw new BusinessError("Mark the invoice unpaid before voiding it.");
      await tx.send.updateMany({ where: { invoiceId: invoice.id }, data: { invoiceId: null } });
      await tx.ledgerEntry.updateMany({ where: { invoiceId: invoice.id, type: "ADJUSTMENT" }, data: { invoiceId: null } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: "VOIDED", voidReason: parsed.data.reason } });
      await logAudit({ userId: user.id, action: "invoice.void", entity: "Invoice", entityId: invoice.id, after: { reason: parsed.data.reason } }, tx);
    });
  } catch (error) {
    return toActionError(error);
  }
  return done("Invoice voided. Its sends can be invoiced again.");
}
