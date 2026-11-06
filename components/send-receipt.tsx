import { Badge, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { METHOD_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import type { SendWithDetails } from "@/server/modules/send/queries";

export function SendReceipt({ send }: { send: SendWithDetails }) {
  const payments = send.ledgerEntries.filter((e) => e.type === "PAYMENT" && e.status === "ACTIVE");
  const agreedDiscount = send.lines.reduce(
    (sum, l) => sum + (l.basePriceSnapshot - l.agreedPriceSnapshot) * l.quantity,
    0,
  );
  const extraDiscount =
    send.lines.reduce((sum, l) => sum + l.extraDiscountPerPiece * l.quantity, 0) + send.wholeDiscount;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{send.hotel.name}</p>
          <p className="text-sm text-(--muted)">{send.hotel.location}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">Receipt #{send.id.slice(-8).toUpperCase()}</p>
          <p className="text-(--muted)">{formatDateTime(send.createdAt)}</p>
          {send.status === "VOIDED" && (
            <p className="mt-1">
              <Badge tone="bad">Voided</Badge>
            </p>
          )}
        </div>
      </div>

      {send.lines.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Base</Th>
              <Th align="right">Agreed</Th>
              <Th align="right">Extra / pc</Th>
              <Th align="right">Final</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {send.lines.map((l) => (
              <tr key={l.id}>
                <Td>{l.product.name}</Td>
                <Td align="right">{l.quantity}</Td>
                <Td align="right">{formatTk(l.basePriceSnapshot)}</Td>
                <Td align="right">{formatTk(l.agreedPriceSnapshot)}</Td>
                <Td align="right">{l.extraDiscountPerPiece ? `-${formatTk(l.extraDiscountPerPiece)}` : "-"}</Td>
                <Td align="right">{formatTk(l.finalUnitPrice)}</Td>
                <Td align="right" className="font-semibold">
                  {formatTk(l.lineTotal)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {send.itemLines.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Hotel&apos;s own items washed</p>
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Price</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {send.itemLines.map((l) => (
                <tr key={l.id}>
                  <Td>{l.serviceItem.name}</Td>
                  <Td align="right">{l.quantity}</Td>
                  <Td align="right">{formatTk(l.unitPriceSnapshot)}</Td>
                  <Td align="right" className="font-semibold">
                    {formatTk(l.lineTotal)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className="ml-auto max-w-sm space-y-2 text-sm">
        <Row label="Subtotal" value={formatTk(send.subtotal)} />
        {send.wholeDiscount > 0 && <Row label="Extra discount (whole)" value={`-${formatTk(send.wholeDiscount)}`} />}
        <Row label="Total charged" value={formatTk(send.total)} strong />
        {payments.map((p) => (
          <Row key={p.id} label={`Paid now (${METHOD_LABEL[p.method ?? "CASH"]})`} value={formatTk(p.amount)} />
        ))}
        {agreedDiscount > 0 && <Row label="Saved by agreed deal" value={formatTk(agreedDiscount)} muted />}
        {extraDiscount > 0 && <Row label="Extra discount given" value={formatTk(extraDiscount)} muted />}
      </div>

      {(send.discountReason || send.note || send.voidReason) && (
        <div className="space-y-1 rounded-2xl bg-(--paper) p-4 text-sm">
          {send.discountReason && <p>Discount reason: {send.discountReason}</p>}
          {send.note && <p>Note: {send.note}</p>}
          {send.voidReason && <p className="text-red-700">Void reason: {send.voidReason}</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-(--line) pt-2 text-base font-semibold" : ""} ${muted ? "text-(--muted)" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
