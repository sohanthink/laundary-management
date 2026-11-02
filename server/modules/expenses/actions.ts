"use server";

import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { startOfDhakaDay } from "@/server/dates";
import { id, isoDate, money, optionalText, parseForm, text, type ActionState } from "@/server/forms";
import { done, toActionError } from "@/server/modules/shared";

const expenseSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: money("Amount").refine((v) => v > 0, "Amount must be more than 0"),
  paidAt: isoDate,
  note: optionalText,
});

export async function createExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("expense:manage");
  const parsed = parseForm(expenseSchema, formData);
  if (!parsed.success) return parsed.state;
  const { paidAt, ...data } = parsed.data;

  const expense = await db.expense.create({
    data: { ...data, paidAt: startOfDhakaDay(paidAt), createdById: user.id },
  });
  await logAudit({ userId: user.id, action: "expense.create", entity: "Expense", entityId: expense.id, after: expense });
  return done("Expense added.");
}

export async function updateExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("expense:manage");
  const parsed = parseForm(expenseSchema.extend({ id }), formData);
  if (!parsed.success) return parsed.state;
  const { id: expenseId, paidAt, ...data } = parsed.data;

  const before = await db.expense.findUnique({ where: { id: expenseId } });
  if (!before) return { error: "Expense not found." };
  const after = await db.expense.update({
    where: { id: expenseId },
    data: { ...data, paidAt: startOfDhakaDay(paidAt) },
  });
  await logAudit({ userId: user.id, action: "expense.update", entity: "Expense", entityId: expenseId, before, after });
  return done("Expense updated.");
}

export async function deleteExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("expense:manage");
  const expenseId = String(formData.get("id") ?? "");
  const before = await db.expense.findUnique({ where: { id: expenseId } });
  if (!before) return { error: "Expense not found." };
  await db.expense.delete({ where: { id: expenseId } });
  await logAudit({ userId: user.id, action: "expense.delete", entity: "Expense", entityId: expenseId, before });
  return done("Expense deleted.");
}

const categorySchema = z.object({ name: text("Name") });

export async function createExpenseCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("expense:manage");
  const parsed = parseForm(categorySchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    const category = await db.expenseCategory.create({ data: parsed.data });
    await logAudit({ userId: user.id, action: "expenseCategory.create", entity: "ExpenseCategory", entityId: category.id, after: category });
  } catch (error) {
    return toActionError(error);
  }
  return done("Category added.");
}

export async function renameExpenseCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("expense:manage");
  const parsed = parseForm(categorySchema.extend({ id }), formData);
  if (!parsed.success) return parsed.state;
  try {
    const after = await db.expenseCategory.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name } });
    await logAudit({ userId: user.id, action: "expenseCategory.rename", entity: "ExpenseCategory", entityId: after.id, after });
  } catch (error) {
    return toActionError(error);
  }
  return done("Category renamed.");
}
