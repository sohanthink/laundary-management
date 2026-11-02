import Link from "next/link";
import { Photo } from "@/components/photo";
import { Badge, Empty, Table, Td, Th } from "@/components/ui/layout";
import { formatDate, formatDateTime } from "@/server/dates";
import { SERVICE_STATUS_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import type { HotelProfile } from "@/server/modules/hotels/queries";
import { describeDiscount } from "@/server/pricing";

export function HoldingsTable({ holdings }: { holdings: HotelProfile["holdings"] }) {
  if (holdings.length === 0) return <Empty>No pieces at this hotel right now.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Product</Th>
          <Th align="right">Pieces held</Th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((h) => (
          <tr key={h.productId}>
            <Td>
              <div className="flex items-center gap-3">
                <Photo path={h.photoPath} alt={h.name} size={32} />
                {h.name}
              </div>
            </Td>
            <Td align="right" className="font-semibold">
              {h.held}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function PricesTable({
  prices,
  servicePrices,
}: {
  prices: HotelProfile["prices"];
  servicePrices: HotelProfile["servicePrices"];
}) {
  if (prices.length === 0 && servicePrices.length === 0) return <Empty>No agreed prices yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Item</Th>
          <Th align="right">Base</Th>
          <Th>Discount</Th>
          <Th align="right">Agreed price</Th>
          <Th>Since</Th>
        </tr>
      </thead>
      <tbody>
        {prices.map((p) => (
          <tr key={p.id}>
            <Td>{p.product.name}</Td>
            <Td align="right">{formatTk(p.product.basePrice)}</Td>
            <Td>{describeDiscount(p.discountType, p.discountValue)}</Td>
            <Td align="right" className="font-semibold">
              {formatTk(p.agreedPrice)}
            </Td>
            <Td>{formatDate(p.validFrom)}</Td>
          </tr>
        ))}
        {servicePrices.map((p) => (
          <tr key={p.id}>
            <Td>
              {p.serviceItem.name} <Badge>washing service</Badge>
            </Td>
            <Td align="right">-</Td>
            <Td>-</Td>
            <Td align="right" className="font-semibold">
              {formatTk(p.price)}
            </Td>
            <Td>{formatDate(p.validFrom)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function SendsTable({
  sends,
  href,
}: {
  sends: HotelProfile["sends"];
  href: (id: string) => string;
}) {
  if (sends.length === 0) return <Empty>No sends yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th align="right">Products</Th>
          <Th align="right">Total</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {sends.map((s) => (
          <tr key={s.id}>
            <Td>
              <Link href={href(s.id)} className="font-medium hover:text-(--teal)">
                {formatDateTime(s.createdAt)}
              </Link>
            </Td>
            <Td align="right">{s._count.lines}</Td>
            <Td align="right">{formatTk(s.total)}</Td>
            <Td>{s.status === "VOIDED" ? <Badge tone="bad">Voided</Badge> : <Badge tone="good">Active</Badge>}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function ServiceOrdersTable({
  orders,
  href,
}: {
  orders: HotelProfile["serviceOrders"];
  href?: (id: string) => string;
}) {
  if (orders.length === 0) return <Empty>No washing service orders yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Received</Th>
          <Th>Items</Th>
          <Th>Status</Th>
          <Th align="right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <Td>
              {href ? (
                <Link href={href(o.id)} className="font-medium hover:text-(--teal)">
                  {formatDate(o.receivedAt)}
                </Link>
              ) : (
                formatDate(o.receivedAt)
              )}
            </Td>
            <Td>{o.lines.map((l) => `${l.quantity} ${l.serviceItem.name}`).join(", ")}</Td>
            <Td>
              <Badge tone={o.status === "DELIVERED" ? "good" : o.status === "CANCELLED" ? "bad" : "warn"}>
                {SERVICE_STATUS_LABEL[o.status]}
              </Badge>
            </Td>
            <Td align="right">{o.status === "DELIVERED" ? formatTk(o.total) : "-"}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
