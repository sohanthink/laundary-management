"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";
import { id, optionalMoney, optionalText, parseForm, type ActionState } from "@/server/forms";
import { isMoneyInput, toPoisha } from "@/server/money";
import { getDue } from "@/server/modules/ledger/core";
import { activePrices } from "@/server/modules/prices/queries";
import { BusinessError, revalidateAll, SERIALIZABLE, toActionError } from "@/server/modules/shared";
import { assertEnough } from "@/server/modules/stock/core";
import { calculateSend } from "@/server/pricing";
import { findSend } from "./queries";
import { receiptRecipient, sendReceiptEmail } from "./receipt";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(100000),
  extraPerPiece: z
    .string()
    .trim()
    .refine((v) => !v || isMoneyInput(v), "Extra discount must be a number like 2 or 1.50"),
});

const sendSchema = z.object({
  hotelId: id,
  lines: z.string().transform((value, ctx) => {
    try {
      return z.array(lineSchema).parse(JSON.parse(value));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid product lines" });
      return z.NEVER;
    }
  }),
  wholeDiscount: optionalMoney,
  discountReason: optionalText,
  note: optionalText,
  paymentAmount: optionalMoney,
  paymentMethod: z.enum(["CASH", "BANK", "EMPLOYEE"]).default("CASH"),
});

export async function createSend(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("send:create");
  const parsed = parseForm(sendSchema, formData);
  if (!parsed.success) return parsed.state;
  const input = parsed.data;

  const lines = input.lines
    .filter((l) => l.quantity > 0)
    .map((l) => ({ ...l, extraPerPiece: l.extraPerPiece ? toPoisha(l.extraPerPiece) : 0 }));
  if (lines.length === 0) return { error: "Enter a quantity for at least one product." };

  const hasExtra = input.wholeDiscount > 0 || lines.some((l) => l.extraPerPiece > 0);
  if (hasExtra && !input.discountReason) {
    return { fieldErrors: { discountReason: ["Give a reason for the extra discount"] } };
  }

  let sendId: string;
  try {
    sendId = await db.$transaction(async (tx) => {
      const hotel = await tx.hotel.findUnique({ where: { id: input.hotelId } });
      if (!hotel || !hotel.isActive) throw new BusinessError("Hotel not found or inactive.");

      // Prices always come from the database, never from the browser.
      const deal = new Map((await activePrices(tx, hotel.id)).map((p) => [p.productId, p]));
      const priced = lines.map((line) => {
        const price = deal.get(line.productId);
        if (!price || !price.product.isActive) {
          throw new BusinessError("A product is not in this hotel's deal. Reload the page.");
        }
        return { line, price };
      });

      await assertEnough(
        tx,
        "AVAILABLE",
        priced.map(({ line, price }) => ({
          productId: line.productId,
          quantity: line.quantity,
          name: price.product.name,
        })),
      );

      const totals = calculateSend(
        priced.map(({ line, price }) => ({
          basePrice: price.product.basePrice,
          agreedPrice: price.agreedPrice,
          extraPerPiece: line.extraPerPiece,
          quantity: line.quantity,
        })),
        input.wholeDiscount,
      );

      const send = await tx.send.create({
        data: {
          hotelId: hotel.id,
          subtotal: totals.subtotal,
          wholeDiscount: totals.wholeDiscount,
          total: totals.total,
          discountReason: hasExtra ? input.discountReason : null,
          note: input.note,
          createdById: user.id,
          lines: {
            create: priced.map(({ line }, i) => ({
              productId: line.productId,
              quantity: line.quantity,
              basePriceSnapshot: totals.lines[i].basePrice,
              agreedPriceSnapshot: totals.lines[i].agreedPrice,
              extraDiscountPerPiece: totals.lines[i].appliedExtra,
              finalUnitPrice: totals.lines[i].finalUnitPrice,
              lineTotal: totals.lines[i].lineTotal,
            })),
          },
        },
      });

      const batchId = randomUUID();
      await tx.stockMovement.createMany({
        data: priced.map(({ line }) => ({
          productId: line.productId,
          hotelId: hotel.id,
          type: "SEND" as const,
          fromState: "AVAILABLE" as const,
          toState: "AT_HOTEL" as const,
          quantity: line.quantity,
          batchId,
          sendId: send.id,
          createdById: user.id,
        })),
      });

      const now = new Date();
      if (totals.total > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId: hotel.id,
            type: "CHARGE",
            amount: totals.total,
            date: now,
            sendId: send.id,
            note: "Sent products",
            createdById: user.id,
          },
        });
      }
      if (input.paymentAmount > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId: hotel.id,
            type: "PAYMENT",
            amount: input.paymentAmount,
            method: input.paymentMethod,
            date: now,
            sendId: send.id,
            note: "Paid at delivery",
            createdById: user.id,
          },
        });
      }

      await logAudit(
        { userId: user.id, action: "send.create", entity: "Send", entityId: send.id, after: { ...totals, payment: input.paymentAmount } },
        tx,
      );
      return send.id;
    }, SERIALIZABLE);
  } catch (error) {
    return toActionError(error);
  }

  after(async () => {
    const send = await findSend(sendId);
    if (!send) return;
    const due = await getDue(db, send.hotelId);
    await sendEmail({ to: receiptRecipient(send.hotel), ...sendReceiptEmail(send, due) });
  });

  revalidateAll();
  redirect(`/admin/send/${sendId}?saved=1`);
}

const voidSchema = z.object({
  id,
  reason: z.string().trim().min(3, "Give a reason"),
});

/** Never deletes: marks the send voided, brings the pieces back and reverses the charge. */
export async function voidSend(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("send:void");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await db.$transaction(async (tx) => {
      const send = await tx.send.findUnique({
        where: { id: parsed.data.id },
        include: { lines: { include: { product: true } } },
      });
      if (!send) throw new BusinessError("Send not found.");
      if (send.status === "VOIDED") throw new BusinessError("This send is already voided.");

      await assertEnough(
        tx,
        "AT_HOTEL",
        send.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, name: l.product.name })),
        send.hotelId,
      );

      const batchId = randomUUID();
      await tx.stockMovement.createMany({
        data: send.lines.map((l) => ({
          productId: l.productId,
          hotelId: send.hotelId,
          type: "SEND_VOID" as const,
          fromState: "AT_HOTEL" as const,
          toState: "AVAILABLE" as const,
          quantity: l.quantity,
          batchId,
          sendId: send.id,
          note: parsed.data.reason,
          createdById: user.id,
        })),
      });

      if (send.total > 0) {
        await tx.ledgerEntry.create({
          data: {
            hotelId: send.hotelId,
            type: "ADJUSTMENT",
            amount: -send.total,
            date: new Date(),
            sendId: send.id,
            note: `Send voided: ${parsed.data.reason}`,
            createdById: user.id,
          },
        });
      }

      await tx.send.update({
        where: { id: send.id },
        data: { status: "VOIDED", voidReason: parsed.data.reason, voidedAt: new Date() },
      });
      await logAudit(
        { userId: user.id, action: "send.void", entity: "Send", entityId: send.id, after: { reason: parsed.data.reason } },
        tx,
      );
    }, SERIALIZABLE);
  } catch (error) {
    if (error instanceof BusinessError && error.message.includes("at the hotel")) {
      return {
        error: `${error.message} Some pieces were already returned, so this send can't be voided. Use an adjustment on the hotel profile instead.`,
      };
    }
    return toActionError(error);
  }

  revalidateAll();
  return { ok: true, message: "Send voided. Stock and due are corrected." };
}
