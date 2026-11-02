"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";
import { checkbox, id, optionalText, parseForm, text, type ActionState } from "@/server/forms";
import { getDue } from "@/server/modules/ledger/core";
import { activeServicePrices } from "@/server/modules/prices/queries";
import { receiptRecipient } from "@/server/modules/send/receipt";
import { BusinessError, done, revalidateAll, toActionError } from "@/server/modules/shared";
import { findServiceOrder } from "./queries";
import { serviceReceiptEmail } from "./receipt";

const itemSchema = z.object({ name: text("Name") });

export async function createServiceItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const parsed = parseForm(itemSchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const item = await db.serviceItem.create({ data: parsed.data });
    await logAudit({ userId: user.id, action: "serviceItem.create", entity: "ServiceItem", entityId: item.id, after: item });
  } catch (error) {
    return toActionError(error);
  }
  return done(`"${parsed.data.name}" added. Set its price on each hotel's prices page.`);
}

export async function updateServiceItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const parsed = parseForm(itemSchema.extend({ id, isActive: checkbox }), formData);
  if (!parsed.success) return parsed.state;
  const { id: itemId, ...data } = parsed.data;
  try {
    const after = await db.serviceItem.update({ where: { id: itemId }, data });
    await logAudit({ userId: user.id, action: "serviceItem.update", entity: "ServiceItem", entityId: itemId, after });
  } catch (error) {
    return toActionError(error);
  }
  return done("Item updated.");
}

const orderSchema = z.object({
  hotelId: id,
  lines: z.string().transform((value, ctx) => {
    try {
      return z
        .array(z.object({ serviceItemId: z.string().min(1), quantity: z.number().int().min(0).max(100000) }))
        .parse(JSON.parse(value));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid item lines" });
      return z.NEVER;
    }
  }),
  note: optionalText,
});

/** The hotel hands over its own items. Nothing is charged until delivery. */
export async function createServiceOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const parsed = parseForm(orderSchema, formData);
  if (!parsed.success) return parsed.state;
  const lines = parsed.data.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) return { error: "Enter a quantity for at least one item." };

  const priced = new Set((await activeServicePrices(db, parsed.data.hotelId)).map((p) => p.serviceItemId));
  if (lines.some((l) => !priced.has(l.serviceItemId))) {
    return { error: "An item has no washing price for this hotel. Reload the page." };
  }

  const order = await db.serviceOrder.create({
    data: {
      hotelId: parsed.data.hotelId,
      note: parsed.data.note,
      createdById: user.id,
      lines: { create: lines },
    },
  });
  await logAudit({ userId: user.id, action: "service.receive", entity: "ServiceOrder", entityId: order.id, after: { lines } });
  revalidateAll();
  redirect(`/admin/services/${order.id}`);
}

export async function markServiceWashed(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const orderId = String(formData.get("id") ?? "");
  const order = await db.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "RECEIVED") return { error: "Only received orders can be marked washed." };

  await db.serviceOrder.update({ where: { id: orderId }, data: { status: "WASHED", washedAt: new Date() } });
  await logAudit({ userId: user.id, action: "service.washed", entity: "ServiceOrder", entityId: orderId });
  return done("Marked as washed.");
}

/** Delivery locks in the prices and adds the charge to the hotel's due. */
export async function deliverServiceOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const orderId = String(formData.get("id") ?? "");

  try {
    await db.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: orderId },
        include: { lines: { include: { serviceItem: true } } },
      });
      if (!order) throw new BusinessError("Order not found.");
      if (order.status === "DELIVERED" || order.status === "CANCELLED") {
        throw new BusinessError("This order is already closed.");
      }

      const prices = new Map((await activeServicePrices(tx, order.hotelId)).map((p) => [p.serviceItemId, p.price]));
      let total = 0;
      for (const line of order.lines) {
        const price = prices.get(line.serviceItemId);
        if (price === undefined) {
          throw new BusinessError(`${line.serviceItem.name} has no washing price for this hotel. Set it first.`);
        }
        const lineTotal = price * line.quantity;
        total += lineTotal;
        await tx.serviceOrderLine.update({
          where: { id: line.id },
          data: { unitPriceSnapshot: price, lineTotal },
        });
      }

      const now = new Date();
      await tx.serviceOrder.update({
        where: { id: orderId },
        data: { status: "DELIVERED", deliveredAt: now, washedAt: order.washedAt ?? now, total },
      });
      if (total > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId: order.hotelId,
            type: "CHARGE",
            amount: total,
            date: now,
            serviceOrderId: orderId,
            note: "Washing service",
            createdById: user.id,
          },
        });
      }
      await logAudit({ userId: user.id, action: "service.deliver", entity: "ServiceOrder", entityId: orderId, after: { total } }, tx);
    });
  } catch (error) {
    return toActionError(error);
  }

  after(async () => {
    const order = await findServiceOrder(orderId);
    if (!order) return;
    const due = await getDue(db, order.hotelId);
    await sendEmail({ to: receiptRecipient(order.hotel), ...serviceReceiptEmail(order, due) });
  });
  return done("Delivered. The washing charge was added to the hotel's due.");
}

export async function cancelServiceOrder(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("service:manage");
  const orderId = String(formData.get("id") ?? "");
  const order = await db.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status === "DELIVERED" || order.status === "CANCELLED") {
    return { error: "Only open orders can be cancelled." };
  }
  await db.serviceOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  await logAudit({ userId: user.id, action: "service.cancel", entity: "ServiceOrder", entityId: orderId });
  return done("Order cancelled.");
}
