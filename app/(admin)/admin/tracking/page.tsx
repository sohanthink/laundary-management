import type { Metadata } from "next";
import Link from "next/link";
import { HotelPicker } from "@/components/hotel-picker";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { MOVEMENT_LABEL } from "@/server/labels";
import { getTrackingPage } from "@/server/modules/tracking/queries";

export const metadata: Metadata = { title: "Tracking" };

export default async function TrackingPage({ searchParams }: PageProps<"/admin/tracking">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" && hotelParam ? hotelParam : undefined;
  const { hotels, products, items, recent, recentItems } = await getTrackingPage(hotelId);

  const sum = (key: "sent" | "returned" | "rejected" | "atHotel") => products.reduce((s, p) => s + p[key], 0);

  return (
    <>
      <PageHeader
        title="Tracking"
        description="How many of your pieces went to each hotel and came back, and which of their items you are holding."
        actions={
          <>
            <LinkButton href="/admin/send" variant="primary">
              Send
            </LinkButton>
            <LinkButton href="/admin/collect">Collect</LinkButton>
          </>
        }
      />

      <div className="mb-6">
        <HotelPicker hotels={hotels} selected={hotelId} label="Filter by hotel" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sent" value={sum("sent")} />
        <Stat label="Returned" value={sum("returned")} />
        <Stat label="Rejected" value={sum("rejected")} tone={sum("rejected") > 0 ? "warn" : "default"} />
        <Stat label="At hotels now" value={sum("atHotel")} />
        <Stat label="Their items with us" value={items.reduce((s, i) => s + i.withUs, 0)} />
      </div>

      <div className="space-y-6">
        <Card title="Your products by hotel">
          {products.length === 0 ? (
            <Empty>Nothing sent yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Hotel</Th>
                  <Th>Product</Th>
                  <Th align="right">Sent</Th>
                  <Th align="right">Returned</Th>
                  <Th align="right">Rejected</Th>
                  <Th align="right">At hotel now</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={`${p.hotelId}-${p.productId}`}>
                    <Td>
                      <Link href={`/admin/hotels/${p.hotelId}`} className="font-medium hover:text-(--teal)">
                        {p.hotelName}
                      </Link>
                    </Td>
                    <Td>{p.productName}</Td>
                    <Td align="right">{p.sent}</Td>
                    <Td align="right">{p.returned}</Td>
                    <Td align="right">{p.rejected}</Td>
                    <Td align="right" className="font-semibold">
                      {p.atHotel}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Hotels' own items">
          {items.length === 0 ? (
            <Empty>No hotel items collected yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Hotel</Th>
                  <Th>Item</Th>
                  <Th align="right">Collected</Th>
                  <Th align="right">Delivered back</Th>
                  <Th align="right">With us now</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={`${i.hotelId}-${i.serviceItemId}`}>
                    <Td>
                      <Link href={`/admin/hotels/${i.hotelId}`} className="font-medium hover:text-(--teal)">
                        {i.hotelName}
                      </Link>
                    </Td>
                    <Td>{i.itemName}</Td>
                    <Td align="right">{i.collected}</Td>
                    <Td align="right">{i.delivered}</Td>
                    <Td align="right" className="font-semibold">
                      {i.withUs}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Latest product movements">
            {recent.length === 0 ? (
              <Empty>Nothing yet.</Empty>
            ) : (
              <ul className="divide-y divide-(--line) text-sm">
                {recent.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <Badge tone={m.type === "SEND" ? "info" : m.type === "REJECT" ? "warn" : m.type === "SEND_VOID" ? "bad" : "default"}>
                        {MOVEMENT_LABEL[m.type]}
                      </Badge>{" "}
                      {m.quantity} {m.product.name} · {m.hotel?.name}
                    </span>
                    <span className="whitespace-nowrap text-(--muted)">{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Latest hotel item movements">
            {recentItems.length === 0 ? (
              <Empty>Nothing yet.</Empty>
            ) : (
              <ul className="divide-y divide-(--line) text-sm">
                {recentItems.map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-center justify-between gap-3 py-2 ${m.send?.status === "VOIDED" ? "text-(--muted) line-through" : ""}`}
                  >
                    <span>
                      <Badge tone={m.type === "COLLECTED" ? "default" : "info"}>
                        {m.type === "COLLECTED" ? "Collected" : "Delivered"}
                      </Badge>{" "}
                      {m.quantity} {m.serviceItem.name} · {m.hotel.name}
                    </span>
                    <span className="whitespace-nowrap text-(--muted)">{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
