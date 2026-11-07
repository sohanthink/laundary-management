"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { counterUnitPrice, isValidPhone, normalizePhone } from "@/server/counter";
import { db } from "@/server/db";
import { checkbox, id, jsonArray, money, optionalMoney, optionalText, parseForm, quantity, text, type ActionState } from "@/server/forms";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { BusinessError, done, revalidateAll, toActionError } from "@/server/modules/shared";
import { getCounterDues } from "./queries";

const itemSchema = z.object({
  name: text("Name"),
  washIronPrice: money("Wash + iron price"),
});

export async function createCounterItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(itemSchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const item = await db.counterItem.create({ data: parsed.data });
    await logAudit({ userId: user.id, action: "counterItem.create", entity: "CounterItem", entityId: item.id, after: item });
  } catch (error) {
    return toActionError(error);
  }
  return done((await getT())("\"{name}\" added.", { name: parsed.data.name }));
}

export async function updateCounterItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(itemSchema.extend({ id, isActive: checkbox }), formData);
  if (!parsed.success) return parsed.state;
  const { id: itemId, ...data } = parsed.data;
  try {
    const after = await db.counterItem.update({ where: { id: itemId }, data });
    await logAudit({ userId: user.id, action: "counterItem.update", entity: "CounterItem", entityId: itemId, after });
  } catch (error) {
    return toActionError(error);
  }
  return done("Item updated.");
}

const saleSchema = z.object({
  phone: z.string().refine(isValidPhone, "Type a valid phone number"),
  name: optionalText,
  lines: jsonArray(
    z.object({
      itemId: z.string().min(1),
      service: z.enum(["WASH_IRON", "IRON_ONLY"]),
      quantity,
    }),
  ),
  note: optionalText,
  paymentAmount: optionalMoney,
  paymentMethod: z.enum(["CASH", "BANK", "POS", "EMPLOYEE"]).default("CASH"),
});

/**
 * Records a walk-in order and/or a payment. The customer is found by phone
 * (or created). Anything not paid now stays as the customer's due.
 */
export async function createCounterSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("send:create");
  const parsed = parseForm(saleSchema, formData);
  if (!parsed.success) return parsed.state;
  const input = parsed.data;
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0 && input.paymentAmount === 0) {
    return { error: "Add at least one item, or enter a payment." };
  }

  const phone = normalizePhone(input.phone);
  let saleId: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      const customer = await tx.walkInCustomer.upsert({
        where: { phone },
        update: input.name ? { name: input.name } : {},
        create: { phone, name: input.name },
      });

      if (lines.length > 0) {
        const items = await tx.counterItem.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
        const byId = new Map(items.map((i) => [i.id, i]));
        const priced = lines.map((l) => {
          const item = byId.get(l.itemId);
          if (!item) throw new BusinessError("An item was not found. Reload the page.");
          const unitPrice = counterUnitPrice(item.washIronPrice, l.service);
          return { ...l, item, unitPrice, lineTotal: unitPrice * l.quantity };
        });
        const sale = await tx.counterSale.create({
          data: {
            customerId: customer.id,
            total: priced.reduce((s, l) => s + l.lineTotal, 0),
            note: input.note,
            createdById: user.id,
            lines: {
              create: priced.map((l) => ({
                counterItemId: l.item.id,
                itemName: l.item.name,
                service: l.service,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
              })),
            },
          },
        });
        saleId = sale.id;
      }

      if (input.paymentAmount > 0) {
        await tx.counterPayment.create({
          data: {
            customerId: customer.id,
            saleId,
            amount: input.paymentAmount,
            method: input.paymentMethod,
            createdById: user.id,
          },
        });
      }
      await logAudit(
        { userId: user.id, action: "counter.sale", entity: "WalkInCustomer", entityId: customer.id, after: { saleId, lines, payment: input.paymentAmount } },
        tx,
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidateAll();
  if (saleId) redirect(`/admin/counter/${saleId}`);
  return {
    ok: true,
    message: (await getT())("Payment of {amount} recorded.", { amount: formatMoney(input.paymentAmount) }),
  };
}

/** Finds a walk-in customer by phone for the counter screen (name and current due). */
export async function lookupCounterCustomer(phone: string) {
  await requirePermission("send:create");
  if (!isValidPhone(phone)) return { found: false as const, phone: normalizePhone(phone), name: "", due: 0 };
  const normalized = normalizePhone(phone);
  const customer = await db.walkInCustomer.findUnique({ where: { phone: normalized } });
  if (!customer) return { found: false as const, phone: normalized, name: "", due: 0 };
  const due = (await getCounterDues(db, [customer.id])).get(customer.id) ?? 0;
  return { found: true as const, phone: normalized, name: customer.name ?? "", due };
}

const voidSchema = z.object({ id, reason: z.string().trim().min(3, "Give a reason") });

/** Voids a walk-in order and the payment taken with it (e.g. entered by mistake). */
export async function voidCounterSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("send:void");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.success) return parsed.state;

  const sale = await db.counterSale.findUnique({ where: { id: parsed.data.id } });
  if (!sale) return { error: "Order not found." };
  if (sale.status === "VOIDED") return { error: "Already voided." };

  await db.$transaction([
    db.counterSale.update({ where: { id: sale.id }, data: { status: "VOIDED", voidReason: parsed.data.reason } }),
    db.counterPayment.updateMany({
      where: { saleId: sale.id, status: "ACTIVE" },
      data: { status: "VOIDED", voidReason: parsed.data.reason },
    }),
  ]);
  await logAudit({ userId: user.id, action: "counter.void", entity: "CounterSale", entityId: sale.id, after: { reason: parsed.data.reason } });
  return done("Order voided.");
}
