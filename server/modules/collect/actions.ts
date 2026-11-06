"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { db } from "@/server/db";
import { id, jsonArray, optionalText, parseForm, quantity, type ActionState } from "@/server/forms";
import { formatMoney, isMoneyInput, toCents } from "@/server/money";
import { BusinessError, done, SERIALIZABLE, toActionError } from "@/server/modules/shared";
import { assertEnough } from "@/server/modules/stock/core";
import { hotelItemFields, resolveHotelItems } from "@/server/modules/tracking/items";

const collectSchema = z.object({
  hotelId: id,
  lines: jsonArray(
    z.object({
      productId: z.string().min(1),
      returned: quantity,
      rejected: quantity,
      creditPerPiece: z
        .string()
        .trim()
        .refine((v) => !v || isMoneyInput(v), "Credit must be a number like 18 or 18.50"),
    }),
  ),
  items: jsonArray(z.object({ ...hotelItemFields, quantity })),
  note: optionalText,
});

/**
 * One visit to the hotel: used pieces come back, rejected (not perfect) pieces
 * come back with a credit, and the hotel's own items are picked up for washing.
 */
export async function collectFromHotel(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("return:create");
  const parsed = parseForm(collectSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, note } = parsed.data;

  const lines = parsed.data.lines
    .filter((l) => l.returned > 0 || l.rejected > 0)
    .map((l) => ({ ...l, creditPerPiece: l.creditPerPiece ? toCents(l.creditPerPiece) : 0 }));
  const items = parsed.data.items.filter((i) => i.quantity > 0);
  if (lines.length === 0 && items.length === 0) {
    return { error: "Enter a quantity for at least one product or item." };
  }

  const t = await getT();
  let summary = "";
  try {
    await db.$transaction(async (tx) => {
      const hotel = await tx.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) throw new BusinessError("Hotel not found.");

      const products = await tx.product.findMany({
        where: { id: { in: lines.map((l) => l.productId) } },
        select: { id: true, name: true },
      });
      const names = new Map(products.map((p) => [p.id, p.name]));

      await assertEnough(
        tx,
        "AT_HOTEL",
        lines.map((l) => ({
          productId: l.productId,
          quantity: l.returned + l.rejected,
          name: names.get(l.productId) ?? "pieces",
        })),
        hotelId,
      );

      const batchId = randomUUID();
      const movements = lines.flatMap((l) => [
        ...(l.returned > 0 ? [{ productId: l.productId, type: "RETURN" as const, quantity: l.returned }] : []),
        ...(l.rejected > 0 ? [{ productId: l.productId, type: "REJECT" as const, quantity: l.rejected }] : []),
      ]);
      if (movements.length > 0) {
        await tx.stockMovement.createMany({
          data: movements.map((m) => ({
            ...m,
            hotelId,
            fromState: "AT_HOTEL" as const,
            toState: "NONE" as const,
            batchId,
            note,
            createdById: user.id,
          })),
        });
      }

      if (items.length > 0) {
        const resolved = await resolveHotelItems(tx, items);
        await tx.hotelItemMovement.createMany({
          data: resolved.map((i) => ({
            hotelId,
            productId: i.productId,
            itemName: i.itemName,
            type: "COLLECTED" as const,
            quantity: i.quantity,
            batchId,
            note,
            createdById: user.id,
          })),
        });
      }

      const rejectedLines = lines.filter((l) => l.rejected > 0 && l.creditPerPiece > 0);
      const credit = rejectedLines.reduce((s, l) => s + l.rejected * l.creditPerPiece, 0);
      if (credit > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId,
            type: "ADJUSTMENT",
            amount: -credit,
            date: new Date(),
            batchId,
            note: `Credit for rejected: ${rejectedLines.map((l) => `${l.rejected} ${names.get(l.productId)}`).join(", ")}`,
            createdById: user.id,
          },
        });
      }

      const returned = lines.reduce((s, l) => s + l.returned, 0);
      const rejected = lines.reduce((s, l) => s + l.rejected, 0);
      const collected = items.reduce((s, i) => s + i.quantity, 0);
      summary = [
        returned > 0 && t("{count} used pieces back", { count: returned }),
        rejected > 0 &&
          (credit > 0
            ? t("{count} rejected (credited {amount})", { count: rejected, amount: formatMoney(credit) })
            : t("{count} rejected", { count: rejected })),
        collected > 0 && t("{count} of their items collected", { count: collected }),
      ]
        .filter(Boolean)
        .join(", ");

      await logAudit(
        { userId: user.id, action: "collect.create", entity: "Hotel", entityId: hotelId, after: { batchId, lines, items, credit } },
        tx,
      );
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }
  return done(t("Saved: {summary}.", { summary }));
}
