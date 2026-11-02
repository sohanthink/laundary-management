import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Input, TextField } from "@/components/ui/field";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { createServiceItem, updateServiceItem } from "@/server/modules/services/actions";
import { getServiceItems } from "@/server/modules/services/queries";

export const metadata: Metadata = { title: "Service items" };

export default async function ServiceItemsPage() {
  const items = await getServiceItems();

  return (
    <>
      <PageHeader
        title="Service items"
        description="Types of hotel-owned items you wash, for example Curtain, Blanket, Uniform."
        actions={<LinkButton href="/admin/services">Back</LinkButton>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="All items">
          {items.length === 0 ? (
            <Empty>No items yet.</Empty>
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
        <Card title="New item">
          <ActionForm action={createServiceItem} submitLabel="Add item">
            <TextField label="Name" name="name" placeholder="Curtain" required />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
