import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { startOfLocalDay, todayIso } from "@/server/dates";

export function monthFromParam(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : todayIso().slice(0, 7);
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export async function getExpensesPage(month: string) {
  await requirePermission("expense:manage");
  const from = startOfLocalDay(`${month}-01`);
  const to = startOfLocalDay(`${nextMonth(month)}-01`);

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({
      where: { paidAt: { gte: from, lt: to } },
      include: { category: true },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    }),
    db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category.name, (byCategory.get(e.category.name) ?? 0) + e.amount);
  }
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    expenses,
    categories,
    total,
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  };
}
