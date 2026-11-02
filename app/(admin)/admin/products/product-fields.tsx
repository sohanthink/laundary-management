import { Field, Input, Select, TextField } from "@/components/ui/field";
import { toTkInput } from "@/server/money";

type Props = {
  categories: { id: string; name: string }[];
  product?: { name: string; categoryId: string; basePrice: number };
  showInitialStock?: boolean;
};

export function ProductFields({ categories, product, showInitialStock }: Props) {
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
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <TextField
        label="Base price per piece (tk)"
        name="basePrice"
        inputMode="decimal"
        defaultValue={product ? toTkInput(product.basePrice) : undefined}
        placeholder="20"
        hint="Your standard price. Each hotel gets its own agreed price later."
        required
      />
      {showInitialStock && (
        <TextField
          label="Pieces you own now"
          name="initialStock"
          type="number"
          min={0}
          placeholder="200"
          hint="Optional. You can add more stock any time."
        />
      )}
      <Field label="Photo" name="photo" hint="JPG, PNG or WebP, up to 2 MB">
        <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
      </Field>
    </>
  );
}
