"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { formatTk, isMoneyInput, toPoisha } from "@/server/money";
import { agreedPrice, type DiscountType } from "@/server/pricing";

type Product = { id: string; name: string; basePrice: number };

type Props = {
  /** Fixed product (editing a row) or a list to pick from (adding). */
  product?: Product;
  products?: Product[];
  defaultType?: DiscountType;
  defaultValue?: string;
};

export function DiscountFields({ product, products, defaultType = "NONE", defaultValue = "" }: Props) {
  const [productId, setProductId] = useState(product?.id ?? "");
  const [type, setType] = useState<DiscountType>(defaultType);
  const [value, setValue] = useState(defaultValue);

  const selected = product ?? products?.find((p) => p.id === productId);
  const numeric = isMoneyInput(value || "0") ? toPoisha(value || "0") : 0;
  const preview = selected ? agreedPrice(selected.basePrice, type, numeric) : null;

  return (
    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : (
        <Field label="Product" name="productId">
          <Select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="" disabled>
              Choose a product
            </option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatTk(p.basePrice)})
              </option>
            ))}
          </Select>
        </Field>
      )}
      {product && (
        <div className="text-sm">
          <p className="font-medium">{product.name}</p>
          <p className="text-(--muted)">Base {formatTk(product.basePrice)}</p>
        </div>
      )}
      <Field label="Discount" name="discountType">
        <Select name="discountType" value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
          <option value="NONE">No discount</option>
          <option value="PERCENT">Percent (%)</option>
          <option value="FLAT">Flat (tk off)</option>
        </Select>
      </Field>
      <Field label={type === "PERCENT" ? "Percent" : "Tk off per piece"} name="discountValue">
        <Input
          name="discountValue"
          inputMode="decimal"
          value={type === "NONE" ? "" : value}
          onChange={(e) => setValue(e.target.value)}
          disabled={type === "NONE"}
          placeholder={type === "PERCENT" ? "10" : "5"}
        />
      </Field>
      <div className="pb-2.5 text-sm">
        <span className="text-(--muted)">Agreed </span>
        <span className="font-semibold text-(--teal)">{preview === null ? "-" : formatTk(preview)}</span>
      </div>
    </div>
  );
}
