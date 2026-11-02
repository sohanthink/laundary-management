"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { id, optionalText, parseForm, positiveInt, type ActionState } from "@/server/forms";
import { BusinessError, done, SERIALIZABLE, toActionError } from "@/server/modules/shared";
import { assertEnough } from "./core";

const stockInSchema = z.object({
  productId: id,
  quantity: positiveInt(),
  note: optionalText,
});

export async function addStock(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("stock:manage");
  const parsed = parseForm(stockInSchema, formData);
  if (!parsed.success) return parsed.state;
  const { productId, quantity, note } = parsed.data;

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  await db.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        type: "STOCK_IN",
        fromState: "NONE",
        toState: "AVAILABLE",
        quantity,
        batchId: randomUUID(),
        note,
        createdById: user.id,
      },
    });
    await logAudit(
      { userId: user.id, action: "stock.in", entity: "StockMovement", entityId: movement.id, after: movement },
      tx,
    );
  });
  return done(`Added ${quantity} ${product.name} to stock.`);
}

const washedSchema = z.object({
  productId: id,
  quantity: positiveInt(),
});

export async function markWashed(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("stock:manage");
  const parsed = parseForm(washedSchema, formData);
  if (!parsed.success) return parsed.state;
  const { productId, quantity } = parsed.data;

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  try {
    await db.$transaction(async (tx) => {
      await assertEnough(tx, "WASHING", [{ productId, quantity, name: product.name }]);
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: "WASHED",
          fromState: "WASHING",
          toState: "AVAILABLE",
          quantity,
          batchId: randomUUID(),
          createdById: user.id,
        },
      });
      await logAudit(
        { userId: user.id, action: "stock.washed", entity: "StockMovement", entityId: movement.id, after: movement },
        tx,
      );
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }
  return done(`${quantity} ${product.name} are washed and available again.`);
}

const writeOffSchema = z.object({
  productId: id,
  quantity: positiveInt(),
  type: z.enum(["LOST", "DAMAGED"]),
  fromState: z.enum(["AT_HOTEL", "WASHING", "AVAILABLE"]),
  hotelId: z.string().optional(),
  note: optionalText,
});

export async function writeOff(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("stock:manage");
  const parsed = parseForm(writeOffSchema, formData);
  if (!parsed.success) return parsed.state;
  const { productId, quantity, type, fromState, note } = parsed.data;
  const hotelId = fromState === "AT_HOTEL" ? parsed.data.hotelId || undefined : undefined;

  if (fromState === "AT_HOTEL" && !hotelId) {
    return { fieldErrors: { hotelId: ["Choose the hotel that lost or damaged it"] } };
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  try {
    await db.$transaction(async (tx) => {
      if (hotelId) {
        const hotel = await tx.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel) throw new BusinessError("Hotel not found.");
      }
      await assertEnough(tx, fromState, [{ productId, quantity, name: product.name }], hotelId);
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          hotelId,
          type,
          fromState,
          toState: "WRITTEN_OFF",
          quantity,
          batchId: randomUUID(),
          note,
          createdById: user.id,
        },
      });
      await logAudit(
        { userId: user.id, action: "stock.writeOff", entity: "StockMovement", entityId: movement.id, after: movement },
        tx,
      );
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }
  return done(`Wrote off ${quantity} ${product.name} as ${type.toLowerCase()}. No charge was added.`);
}
