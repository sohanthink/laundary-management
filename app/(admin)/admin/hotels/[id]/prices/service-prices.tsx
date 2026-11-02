import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, TextField } from "@/components/ui/field";
import { Card, Empty } from "@/components/ui/layout";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { toTkInput } from "@/server/money";
import { removeHotelServicePrice, setHotelServicePrice } from "@/server/modules/prices/actions";
import { activeServicePrices } from "@/server/modules/prices/queries";

export async function ServicePricesCard({ hotelId }: { hotelId: string }) {
  await requirePermission("price:manage");
  const [prices, items] = await Promise.all([
    activeServicePrices(db, hotelId),
    db.serviceItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const priced = new Set(prices.map((p) => p.serviceItemId));
  const addable = items.filter((i) => !priced.has(i.id));

  return (
    <Card title="Washing service prices (hotel's own items)">
      <p className="mb-4 text-sm text-(--muted)">
        Price per piece for washing items that belong to the hotel. Manage the item list on the{" "}
        <Link href="/admin/services/items" className="text-(--teal) underline">
          service items page
        </Link>
        .
      </p>
      {prices.length === 0 ? (
        <Empty>No washing prices set for this hotel.</Empty>
      ) : (
        <ul className="mb-5 space-y-2">
          {prices.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-(--line) p-3">
              <ActionForm
                action={setHotelServicePrice}
                submitLabel="Update"
                resetOnSuccess={false}
                className="flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="hotelId" value={hotelId} />
                <input type="hidden" name="serviceItemId" value={p.serviceItemId} />
                <span className="min-w-32 font-medium">{p.serviceItem.name}</span>
                <Input name="price" defaultValue={toTkInput(p.price)} inputMode="decimal" className="w-28" />
                <span className="text-sm text-(--muted)">tk / piece</span>
              </ActionForm>
              <ActionForm
                action={removeHotelServicePrice}
                submitLabel="Remove"
                submitVariant="danger"
                className="flex items-center gap-2"
              >
                <input type="hidden" name="hotelId" value={hotelId} />
                <input type="hidden" name="serviceItemId" value={p.serviceItemId} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      {addable.length > 0 && (
        <ActionForm action={setHotelServicePrice} submitLabel="Add washing price" className="grid items-end gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input type="hidden" name="hotelId" value={hotelId} />
          <Field label="Item" name="serviceItemId">
            <Select name="serviceItemId" defaultValue="" required>
              <option value="" disabled>
                Choose an item
              </option>
              {addable.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <TextField label="Price per piece (tk)" name="price" inputMode="decimal" placeholder="30" required />
        </ActionForm>
      )}
    </Card>
  );
}
