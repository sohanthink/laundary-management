import "server-only";
import type { StockState } from "@prisma/client";
import { db, type Tx } from "@/server/db";
import { BusinessError } from "@/server/modules/shared";
import { computeBuckets, emptyBuckets, type Buckets } from "@/server/stock";

type Client = Tx | typeof db;

/** Buckets per product. With hotelId, AT_HOTEL is what that hotel currently holds. */
export async function getBucketsByProduct(
  client: Client,
  filter: { hotelId?: string; productIds?: string[] } = {},
): Promise<Map<string, Buckets>> {
  const rows = await client.stockMovement.groupBy({
    by: ["productId", "fromState", "toState"],
    where: {
      ...(filter.hotelId ? { hotelId: filter.hotelId } : {}),
      ...(filter.productIds ? { productId: { in: filter.productIds } } : {}),
    },
    _sum: { quantity: true },
  });

  const grouped = new Map<string, { fromState: StockState; toState: StockState; quantity: number }[]>();
  for (const row of rows) {
    const list = grouped.get(row.productId) ?? [];
    list.push({ fromState: row.fromState, toState: row.toState, quantity: row._sum.quantity ?? 0 });
    grouped.set(row.productId, list);
  }

  const result = new Map<string, Buckets>();
  for (const [productId, movements] of grouped) {
    result.set(productId, computeBuckets(movements));
  }
  return result;
}

export function bucketsFor(map: Map<string, Buckets>, productId: string) {
  return map.get(productId) ?? emptyBuckets();
}

const STATE_LABEL: Record<StockState, string> = {
  NONE: "none",
  AVAILABLE: "available",
  AT_HOTEL: "at the hotel",
  WASHING: "in washing",
  WRITTEN_OFF: "written off",
};

/** Throws a user-facing error if any line asks for more pieces than the state holds. */
export async function assertEnough(
  tx: Tx,
  state: Exclude<StockState, "NONE">,
  lines: { productId: string; quantity: number; name: string }[],
  hotelId?: string,
) {
  const buckets = await getBucketsByProduct(tx, {
    hotelId,
    productIds: lines.map((l) => l.productId),
  });
  for (const line of lines) {
    const have = bucketsFor(buckets, line.productId)[state];
    if (line.quantity > have) {
      throw new BusinessError(
        `Only ${have} ${line.name} ${STATE_LABEL[state]}, but you entered ${line.quantity}.`,
      );
    }
  }
}
