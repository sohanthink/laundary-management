import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { SERVICE_STATUS_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import {
  cancelServiceOrder,
  deliverServiceOrder,
  markServiceWashed,
} from "@/server/modules/services/actions";
import { getServiceOrder } from "@/server/modules/services/queries";

export const metadata: Metadata = { title: "Washing order" };

export default async function ServiceOrderPage({ params }: PageProps<"/admin/services/[id]">) {
  const { id } = await params;
  const result = await getServiceOrder(id);
  if (!result) notFound();
  const { order, currentPrices } = result;
  const delivered = order.status === "DELIVERED";
  const open = order.status === "RECEIVED" || order.status === "WASHED";

  return (
    <>
      <PageHeader
        title={`Washing order · ${order.hotel.name}`}
        description={`Order #${order.id.slice(-8).toUpperCase()}`}
        actions={
          <>
            <LinkButton href={`/admin/hotels/${order.hotelId}`}>Hotel profile</LinkButton>
            <LinkButton href="/admin/services">All orders</LinkButton>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="Items">
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Pieces</Th>
                <Th align="right">{delivered ? "Price" : "Current price"}</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => {
                const price = delivered ? l.unitPriceSnapshot : currentPrices.get(l.serviceItemId);
                return (
                  <tr key={l.id}>
                    <Td>{l.serviceItem.name}</Td>
                    <Td align="right">{l.quantity}</Td>
                    <Td align="right">{price === undefined ? "No price" : formatTk(price)}</Td>
                    <Td align="right" className="font-semibold">
                      {price === undefined ? "-" : formatTk(delivered ? l.lineTotal : price * l.quantity)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {delivered && (
            <p className="mt-4 text-right text-lg font-semibold">Total charged {formatTk(order.total)}</p>
          )}
          {order.note && <p className="mt-4 text-sm text-(--muted)">Note: {order.note}</p>}
        </Card>

        <Card title="Status">
          <p className="mb-4">
            <Badge tone={delivered ? "good" : order.status === "CANCELLED" ? "bad" : "warn"}>
              {SERVICE_STATUS_LABEL[order.status]}
            </Badge>
          </p>
          <dl className="space-y-1 text-sm">
            <p>Received: {formatDateTime(order.receivedAt)}</p>
            {order.washedAt && <p>Washed: {formatDateTime(order.washedAt)}</p>}
            {order.deliveredAt && <p>Delivered: {formatDateTime(order.deliveredAt)}</p>}
          </dl>
          {open && (
            <div className="mt-5 space-y-3 border-t border-(--line) pt-5">
              {order.status === "RECEIVED" && (
                <ActionForm action={markServiceWashed} submitLabel="Mark washed" submitVariant="dark">
                  <input type="hidden" name="id" value={order.id} />
                </ActionForm>
              )}
              <ActionForm
                action={deliverServiceOrder}
                submitLabel="Deliver and charge"
                confirm="Deliver to the hotel and add the charge to its due?"
              >
                <input type="hidden" name="id" value={order.id} />
              </ActionForm>
              <ActionForm
                action={cancelServiceOrder}
                submitLabel="Cancel order"
                submitVariant="danger"
                confirm="Cancel this order? Nothing will be charged."
              >
                <input type="hidden" name="id" value={order.id} />
              </ActionForm>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
