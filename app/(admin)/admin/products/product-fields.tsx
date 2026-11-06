import { Field, Input, Option, Select, TextField } from "@/components/ui/field";
import { toMoneyInput } from "@/server/money";

type Props = {
  categories: { id: string; name: string }[];
  product?: { name: string; categoryId: string; basePrice: number };
};

export function ProductFields({ categories, product }: Props) {
  return (
    <>
      <TextField
        label="Name"
        name="name"
        defaultValue={product?.name}
        placeholder="Pillow cover"
        required
      />
      <Field label="Category" name="categoryId">
        <Select name="categoryId" defaultValue={product?.categoryId ?? ""} required>
          <Option value="" disabled>
            Choose a category
          </Option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <TextField
        label="Base price per piece (€)"
        name="basePrice"
        inputMode="decimal"
        defaultValue={product ? toMoneyInput(product.basePrice) : undefined}
        placeholder="20"
        hint="Your standard price. Each hotel gets its own agreed price later."
        required
      />
      <Field label="Photo" name="photo" hint="JPG, PNG or WebP, up to 2 MB">
        <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
      </Field>
    </>
  );
}
