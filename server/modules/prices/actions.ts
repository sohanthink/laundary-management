"use server";

import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { db } from "@/server/db";
import { id, parseForm, type ActionState } from "@/server/forms";
import { isMoneyInput, percentToBasisPoints, toCents } from "@/server/money";
import { done } from "@/server/modules/shared";
import { agreedPrice } from "@/server/pricing";

const dealSchema = z.object({
  hotelId: id,
  productId: z.string().min(1, "Choose a product"),
  discountType: z.enum(["NONE", "PERCENT", "FLAT"]),
  discountValue: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isMoneyInput(v), "Enter a number like 10 or 2.5"),
});

/** Adds a product to the deal or changes its discount. The old price row is closed, never edited. */
export async function setHotelPrice(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("price:manage");
  const parsed = parseForm(dealSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, productId, discountType } = parsed.data;
  const rawValue = parsed.data.discountValue || "0";

  const [hotel, product] = await Promise.all([
    db.hotel.findUnique({ where: { id: hotelId } }),
    db.product.findUnique({ where: { id: productId } }),
  ]);
  if (!hotel || !product) return { error: "Hotel or product not found." };

  let discountValue = 0;
  if (discountType === "PERCENT") {
    discountValue = percentToBasisPoints(rawValue);
    if (discountValue > 10000) {
      return { fieldErrors: { discountValue: ["Percent can't be more than 100"] } };
    }
  } else if (discountType === "FLAT") {
    discountValue = toCents(rawValue);
    if (discountValue > product.basePrice) {
      return { fieldErrors: { discountValue: ["Discount can't be more than the base price"] } };
    }
  }
  const price = agreedPrice(product.basePrice, discountType, discountValue);

  await db.$transaction(async (tx) => {
    const now = new Date();
    const current = await tx.hotelPrice.findFirst({
      where: { hotelId, productId, validTo: null },
    });
    if (current) {
      await tx.hotelPrice.update({ where: { id: current.id }, data: { validTo: now } });
    }
    const created = await tx.hotelPrice.create({
      data: {
        hotelId,
        productId,
        discountType,
        discountValue,
        agreedPrice: price,
        validFrom: now,
        createdById: user.id,
      },
    });
    await logAudit(
      {
        userId: user.id,
        action: current ? "price.change" : "price.add",
        entity: "HotelPrice",
        entityId: created.id,
        before: current,
        after: created,
      },
      tx,
    );
  });

  return done((await getT())("{product} is set for {hotel}.", { product: product.name, hotel: hotel.name }));
}

const removeSchema = z.object({ hotelId: id, productId: id });

export async function removeHotelPrice(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("price:manage");
  const parsed = parseForm(removeSchema, formData);
  if (!parsed.success) return parsed.state;

  const current = await db.hotelPrice.findFirst({
    where: { ...parsed.data, validTo: null },
  });
  if (!current) return { error: "This product is not in the deal." };

  await db.hotelPrice.update({ where: { id: current.id }, data: { validTo: new Date() } });
  await logAudit({ userId: user.id, action: "price.remove", entity: "HotelPrice", entityId: current.id, before: current });
  return done("Product removed from this hotel's deal.");
}
