import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Input, TextField } from "@/components/ui/field";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/link-button";
import { counterUnitPrice } from "@/server/counter";
import { getT } from "@/server/i18n";
import { formatMoney, toMoneyInput } from "@/server/money";
import { createCounterItem, updateCounterItem } from "@/server/modules/counter/actions";
import { getCounterItems } from "@/server/modules/counter/queries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Counter prices") };
}

export default async function CounterPricesPage() {
  const t = await getT();
  const items = await getCounterItems();

  return (
    <>
      <PageHeader
        title="Counter prices"
        description="Prices for walk-in customers. Enter the wash + iron price; iron only is half."
        actions={<LinkButton href="/admin/counter" variant="primary">Open counter</LinkButton>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="Price list">
          {items.length === 0 ? (
            <Empty>No counter items yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-(--line) p-3">
                  <ActionForm action={updateCounterItem} submitLabel="Save" resetOnSuccess={false} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="name" defaultValue={item.name} className="max-w-56" required aria-label={t("Name")} />
                    <Input
                      name="washIronPrice"
                      defaultValue={toMoneyInput(item.washIronPrice)}
                      inputMode="decimal"
                      className="w-28"
                      required
                      aria-label={t("Wash + iron price")}
                    />
                    <span className="text-sm text-(--muted)">
                      {t("Iron only")}: {formatMoney(counterUnitPrice(item.washIronPrice, "IRON_ONLY"))}
                    </span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isActive" defaultChecked={item.isActive} className="size-5 accent-(--teal)" />
                      {t("Active")}
                    </label>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="New item">
          <ActionForm action={createCounterItem} submitLabel="Add">
            <TextField label="Name" name="name" placeholder="Shirt" required />
            <TextField label="Wash + iron price (€)" name="washIronPrice" inputMode="decimal" placeholder="4.00" hint="Iron only is charged at half this price." required />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
