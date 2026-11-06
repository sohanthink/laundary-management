import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Input, TextField } from "@/components/ui/field";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { createServiceItem, updateServiceItem } from "@/server/modules/products/actions";
import { getServiceItems } from "@/server/modules/products/queries";

export const metadata: Metadata = { title: "Hotel's own items" };

export default async function HotelItemsPage() {
  const items = await getServiceItems();

  return (
    <>
      <PageHeader
        title="Hotel's own items"
        description="Types of items that belong to hotels and that you wash, for example Curtain, Blanket, Uniform. Set the price per hotel on its prices page."
        actions={<LinkButton href="/admin/products">Back to products</LinkButton>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="All item types">
          {items.length === 0 ? (
            <Empty>No item types yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-(--line) p-3">
                  <ActionForm
                    action={updateServiceItem}
                    submitLabel="Save"
                    resetOnSuccess={false}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="name" defaultValue={item.name} className="max-w-xs" required />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isActive" defaultChecked={item.isActive} className="size-4 accent-(--teal)" />
                      Active
                    </label>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="New item type">
          <ActionForm action={createServiceItem} submitLabel="Add">
            <TextField label="Name" name="name" placeholder="Curtain" required />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
