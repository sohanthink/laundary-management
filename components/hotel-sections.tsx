import Link from "next/link";
import { Photo } from "@/components/photo";
import { Badge, Empty, Table, Td, Th } from "@/components/ui/layout";
import { formatDate, formatDateTime } from "@/server/dates";
import { formatTk } from "@/server/money";
import type { HotelProfile } from "@/server/modules/hotels/queries";
import { describeDiscount } from "@/server/pricing";

export function TrackingTable({ tracking }: { tracking: HotelProfile["tracking"] }) {
  if (tracking.length === 0) return <Empty>Nothing sent to this hotel yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Product</Th>
          <Th align="right">Sent</Th>
          <Th align="right">Returned</Th>
          <Th align="right">Rejected</Th>
          <Th align="right">At hotel now</Th>
        </tr>
      </thead>
      <tbody>
        {tracking.map((t) => (
          <tr key={t.productId}>
            <Td>
              <div className="flex items-center gap-3">
                <Photo path={t.photoPath} alt={t.name} size={32} />
                {t.name}
              </div>
            </Td>
            <Td align="right">{t.sent}</Td>
            <Td align="right">{t.returned}</Td>
            <Td align="right">{t.rejected}</Td>
            <Td align="right" className="font-semibold">
              {t.atHotel}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function ItemsWithUsTable({ items }: { items: HotelProfile["itemTracking"] }) {
  if (items.length === 0) return <Empty>No hotel items collected for washing yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Item</Th>
          <Th align="right">Collected</Th>
          <Th align="right">Delivered back</Th>
          <Th align="right">With us now</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.serviceItemId}>
            <Td>{t.name}</Td>
            <Td align="right">{t.collected}</Td>
            <Td align="right">{t.delivered}</Td>
            <Td align="right" className="font-semibold">
              {t.withUs}
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
              {p.serviceItem.name} <Badge>washing their item</Badge>
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
          <Th align="right">Lines</Th>
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
            <Td align="right">{s._count.lines + s._count.itemLines}</Td>
            <Td align="right">{formatTk(s.total)}</Td>
            <Td>{s.status === "VOIDED" ? <Badge tone="bad">Voided</Badge> : <Badge tone="good">Active</Badge>}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
