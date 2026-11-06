import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Option, Select, TextField, inputClass } from "@/components/ui/field";
import { Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatDate, toLocalIsoDate, todayIso } from "@/server/dates";
import { formatMoney, toMoneyInput } from "@/server/money";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  renameExpenseCategory,
  updateExpense,
} from "@/server/modules/expenses/actions";
import { getExpensesPage, monthFromParam } from "@/server/modules/expenses/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Expenses") };
}

type Category = { id: string; name: string };
type ExpenseValues = { categoryId: string; amount: number; paidAt: Date; note: string | null };

function ExpenseFields({ categories, expense }: { categories: Category[]; expense?: ExpenseValues }) {
  return (
    <>
      <Field label="Category" name="categoryId">
        <Select name="categoryId" defaultValue={expense?.categoryId ?? ""} required>
          <Option value="" disabled>
            Choose a category
          </Option>
          {categories.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name}
            </Option>
          ))}
        </Select>
      </Field>
      <TextField
        label="Amount (€)"
        name="amount"
        inputMode="decimal"
        defaultValue={expense ? toMoneyInput(expense.amount) : undefined}
        required
      />
      <TextField
        label="Date"
        name="paidAt"
        type="date"
        defaultValue={expense ? toLocalIsoDate(expense.paidAt) : todayIso()}
        required
      />
      <TextField label="Note" name="note" defaultValue={expense?.note ?? ""} />
    </>
  );
}

export default async function ExpensesPage({ searchParams }: PageProps<"/admin/expenses">) {
  const sp = await searchParams;
  const month = monthFromParam(sp.month);
  const t = await getT();
  const { expenses, categories, total, byCategory } = await getExpensesPage(month);

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Money out: detergent, salaries, transport and so on."
        actions={
          <>
            <form className="flex items-end gap-2">
              <input type="month" name="month" defaultValue={month} className={`${inputClass} h-10`} />
              <button type="submit" className={buttonClass("secondary", "sm", "h-10")}>
                {t("Show")}
              </button>
            </form>
            <Modal trigger="Categories" title="Expense categories" triggerVariant="secondary">
              <div className="space-y-3">
                {categories.map((c) => (
                  <ActionForm
                    key={c.id}
                    action={renameExpenseCategory}
                    submitLabel="Rename"
                    resetOnSuccess={false}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <Input name="name" defaultValue={c.name} required />
                  </ActionForm>
                ))}
                <div className="border-t border-(--line) pt-3">
                  <ActionForm action={createExpenseCategory} submitLabel="Add category">
                    <TextField label="New category" name="name" required />
                  </ActionForm>
                </div>
              </div>
            </Modal>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title={`${month} · ${t("Total")} ${formatMoney(total)}`}>
            {expenses.length === 0 ? (
              <Empty>No expenses this month.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Category</Th>
                    <Th>Note</Th>
                    <Th align="right">Amount</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <Td className="whitespace-nowrap">{formatDate(e.paidAt)}</Td>
                      <Td>{t(e.category.name)}</Td>
                      <Td>{e.note}</Td>
                      <Td align="right" className="font-semibold">
                        {formatMoney(e.amount)}
                      </Td>
                      <Td align="right">
                        <Modal trigger="Edit" title="Edit expense" triggerVariant="ghost" triggerSize="sm">
                          <ActionForm action={updateExpense} submitLabel="Save" resetOnSuccess={false}>
                            <input type="hidden" name="id" value={e.id} />
                            <ExpenseFields categories={categories} expense={e} />
                          </ActionForm>
                          <div className="mt-4 border-t border-(--line) pt-4">
                            <ActionForm
                              action={deleteExpense}
                              submitLabel="Delete expense"
                              submitVariant="danger"
                              confirm="Delete this expense?"
                            >
                              <input type="hidden" name="id" value={e.id} />
                            </ActionForm>
                          </div>
                        </Modal>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          {byCategory.length > 0 && (
            <Card title="By category">
              <ul className="space-y-2 text-sm">
                {byCategory.map(([name, amount]) => (
                  <li key={name} className="flex justify-between">
                    <span>{t(name)}</span>
                    <span className="font-medium tabular-nums">{formatMoney(amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card title="Add expense">
          <ActionForm action={createExpense} submitLabel="Add expense">
            <ExpenseFields categories={categories} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
