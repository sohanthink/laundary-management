"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
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
  return done((await getT())("Category \"{name}\" created.", { name: parsed.data.name }));
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
});

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(productSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const photoPath = await saveUpload(formData.get("photo"), "products");
    const product = await db.product.create({ data: { ...parsed.data, photoPath } });
    await logAudit({ userId: user.id, action: "product.create", entity: "Product", entityId: product.id, after: product });
  } catch (error) {
    return toActionError(error);
  }
  return done((await getT())("Product \"{name}\" created.", { name: parsed.data.name }));
}

const itemSchema = z.object({ name: text("Name") });

/** Types of the hotel's own items you wash (Curtain, Blanket, ...). */
export async function createServiceItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
  const parsed = parseForm(itemSchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const item = await db.serviceItem.create({ data: parsed.data });
    await logAudit({ userId: user.id, action: "serviceItem.create", entity: "ServiceItem", entityId: item.id, after: item });
  } catch (error) {
    return toActionError(error);
  }
  return done((await getT())("\"{name}\" added. Set its washing price on each hotel's prices page.", { name: parsed.data.name }));
}

export async function updateServiceItem(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("catalog:manage");
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

const updateProductSchema = productSchema.extend({
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
