"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { id, optionalText, parseForm, type ActionState } from "@/server/forms";
import { BusinessError, done, SERIALIZABLE, toActionError } from "@/server/modules/shared";
import { assertEnough } from "@/server/modules/stock/core";

const returnSchema = z.object({
  hotelId: id,
  lines: z.string().transform((value, ctx) => {
    try {
      return z
        .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(0).max(100000) }))
        .parse(JSON.parse(value));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid product lines" });
      return z.NEVER;
    }
  }),
  note: optionalText,
});

/** Used pieces come back from the hotel and go to washing. No money changes. */
export async function createReturn(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("return:create");
  const parsed = parseForm(returnSchema, formData);
  if (!parsed.success) return parsed.state;
  const { hotelId, note } = parsed.data;
  const lines = parsed.data.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) return { error: "Enter a quantity for at least one product." };

  let pieces = 0;
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
        lines.map((l) => ({ ...l, name: names.get(l.productId) ?? "pieces" })),
        hotelId,
      );

      const batchId = randomUUID();
      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          productId: l.productId,
          hotelId,
          type: "RETURN" as const,
          fromState: "AT_HOTEL" as const,
          toState: "WASHING" as const,
          quantity: l.quantity,
          batchId,
          note,
          createdById: user.id,
        })),
      });
      pieces = lines.reduce((sum, l) => sum + l.quantity, 0);
      await logAudit(
        { userId: user.id, action: "return.create", entity: "Hotel", entityId: hotelId, after: { batchId, lines } },
        tx,
      );
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }
  return done(`${pieces} pieces received back and moved to washing.`);
}
