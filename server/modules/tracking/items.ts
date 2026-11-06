import "server-only";
import { z } from "zod";
import type { Tx } from "@/server/db";
import { BusinessError } from "@/server/modules/shared";

/** One line of the hotel's own pieces: one of our product types, or "Other" with a typed name. */
export const hotelItemFields = {
  productId: z.string().min(1).nullable(),
  name: z.string().trim().max(80),
};

/** Checks product ids and returns the name to store with each line. */
export async function resolveHotelItems<T extends { productId: string | null; name: string }>(tx: Tx, items: T[]) {
  const ids = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))];
  const products = ids.length
    ? await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = new Map(products.map((p) => [p.id, p.name]));

  return items.map((item) => {
    if (item.productId) {
      const name = names.get(item.productId);
      if (!name) throw new BusinessError("A product was not found. Reload the page.");
      return { ...item, itemName: name };
    }
    if (!item.name) throw new BusinessError("Type a name for the other item.");
    return { ...item, itemName: item.name };
  });
}
