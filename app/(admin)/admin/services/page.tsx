import type { Metadata } from "next";
import Link from "next/link";
import { HotelPicker } from "@/components/hotel-picker";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDate } from "@/server/dates";
import { SERVICE_STATUS_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import { getServicesScreen } from "@/server/modules/services/queries";
import { ServiceOrderForm } from "./service-order-form";

export const metadata: Metadata = { title: "Washing service" };

type Order = Awaited<ReturnType<typeof getServicesScreen>>["openOrders"][number];

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Received</Th>
          <Th>Hotel</Th>
          <Th>Items</Th>
          <Th>Status</Th>
          <Th align="right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <Td>
              <Link href={`/admin/services/${o.id}`} className="font-medium hover:text-(--teal)">
                {formatDate(o.receivedAt)}
              </Link>
            </Td>
            <Td>{o.hotel.name}</Td>
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

export default async function ServicesPage({ searchParams }: PageProps<"/admin/services">) {
  const { hotel: hotelParam } = await searchParams;
  const hotelId = typeof hotelParam === "string" ? hotelParam : undefined;
  const { hotels, hotel, prices, openOrders, recentDelivered } = await getServicesScreen(hotelId);

  return (
    <>
      <PageHeader
        title="Washing service"
        description="Washing items that belong to the hotel. Not your stock. Charged when delivered back."
        actions={<LinkButton href="/admin/services/items">Service items</LinkButton>}
      />
      <div className="space-y-6">
        <Card title="Receive items from a hotel">
          <div className="mb-6">
            <HotelPicker hotels={hotels} selected={hotel?.id} />
          </div>
          {!hotel ? (
            <Empty>Choose a hotel.</Empty>
          ) : prices.length === 0 ? (
            <Empty>
              {hotel.name} has no washing prices yet.{" "}
              <Link href={`/admin/hotels/${hotel.id}/prices`} className="text-(--teal) underline">
                Set them on its prices page
              </Link>
              .
            </Empty>
          ) : (
            <ServiceOrderForm
              key={hotel.id}
              hotelId={hotel.id}
              rows={prices.map((p) => ({ serviceItemId: p.serviceItemId, name: p.serviceItem.name, price: p.price }))}
            />
          )}
        </Card>

        <Card title="Open orders">
          {openOrders.length === 0 ? <Empty>No open orders.</Empty> : <OrdersTable orders={openOrders} />}
        </Card>

        <Card title="Recently closed">
          {recentDelivered.length === 0 ? <Empty>Nothing yet.</Empty> : <OrdersTable orders={recentDelivered} />}
        </Card>
      </div>
    </>
  );
}
