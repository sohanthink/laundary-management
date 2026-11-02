"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { checkbox, id, money, parseForm, text, type ActionState } from "@/server/forms";
import { done, revalidateAll, toActionError } from "@/server/modules/shared";
import { saveUpload } from "@/server/uploads";

const categorySchema = z.object({ name: text("Name") });

export async function createCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(categorySchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const category = await db.category.create({ data: { name: parsed.data.name } });
    await logAudit({ userId: user.id, action: "category.create", entity: "Category", entityId: category.id, after: category });
  } catch (error) {
    return toActionError(error);
  }
  return done(`Category "${parsed.data.name}" created.`);
}

const renameCategorySchema = z.object({ id, name: text("Name") });

export async function renameCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(renameCategorySchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const before = await db.category.findUnique({ where: { id: parsed.data.id } });
    const after = await db.category.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name } });
    await logAudit({ userId: user.id, action: "category.rename", entity: "Category", entityId: after.id, before, after });
  } catch (error) {
    return toActionError(error);
  }
  return done("Category renamed.");
}

const productSchema = z.object({
  name: text("Name"),
  categoryId: z.string().min(1, "Choose a category"),
  basePrice: money("Base price"),
  initialStock: z.coerce.number().int().min(0).max(100000).optional().default(0),
});

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(productSchema, formData);
  if (!parsed.success) return parsed.state;
  const { name, categoryId, basePrice, initialStock } = parsed.data;

  try {
    const photoPath = await saveUpload(formData.get("photo"), "products");
    await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { name, categoryId, basePrice, photoPath },
      });
      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "STOCK_IN",
            fromState: "NONE",
            toState: "AVAILABLE",
            quantity: initialStock,
            batchId: randomUUID(),
            note: "Initial stock",
            createdById: user.id,
          },
        });
      }
      await logAudit({ userId: user.id, action: "product.create", entity: "Product", entityId: product.id, after: product }, tx);
    });
  } catch (error) {
    return toActionError(error);
  }
  return done(`Product "${name}" created.`);
}

const updateProductSchema = productSchema.omit({ initialStock: true }).extend({
  id,
  isActive: checkbox,
});

export async function updateProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(updateProductSchema, formData);
  if (!parsed.success) return parsed.state;
  const { id: productId, ...data } = parsed.data;

  try {
    const before = await db.product.findUnique({ where: { id: productId } });
    if (!before) return { error: "Product not found." };
    const photoPath = await saveUpload(formData.get("photo"), "products");
    const after = await db.product.update({
      where: { id: productId },
      data: { ...data, ...(photoPath ? { photoPath } : {}) },
    });
    await logAudit({ userId: user.id, action: "product.update", entity: "Product", entityId: productId, before, after });
  } catch (error) {
    return toActionError(error);
  }
  revalidateAll();
  redirect("/admin/products");
}
