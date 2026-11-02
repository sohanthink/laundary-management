import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Empty, Table, Td, Th } from "@/components/ui/layout";
import { formatDate } from "@/server/dates";
import { LEDGER_LABEL, METHOD_LABEL } from "@/server/labels";
import { formatTk } from "@/server/money";
import type { Statement } from "@/server/modules/ledger/statement";

type Row = Statement["rows"][number];

export function StatementTable({
  statement,
  sendHref,
  actions,
}: {
  statement: Statement;
  sendHref?: (sendId: string) => string;
  actions?: (row: Row) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-5">
        <Summary label="Opening due" value={statement.opening} />
        <Summary label="Charges" value={statement.charges} />
        <Summary label="Payments" value={statement.payments} />
        <Summary label="Adjustments" value={statement.adjustments} />
        <Summary label="Closing due" value={statement.closing} strong />
      </div>
      {statement.rows.length === 0 ? (
        <Empty>No entries in this period.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Entry</Th>
              <Th>Details</Th>
              <Th align="right">Charge</Th>
              <Th align="right">Payment</Th>
              <Th align="right">Due after</Th>
              {actions && <Th />}
            </tr>
          </thead>
          <tbody>
            {statement.rows.map((row) => {
              const voided = row.status === "VOIDED";
              const increases = row.type === "CHARGE" || (row.type === "ADJUSTMENT" && row.amount > 0);
              return (
                <tr key={row.id} className={voided ? "text-(--muted) line-through" : ""}>
                  <Td className="whitespace-nowrap">{formatDate(row.date)}</Td>
                  <Td>
                    <Badge tone={row.type === "PAYMENT" ? "good" : row.type === "CHARGE" ? "info" : "warn"}>
                      {LEDGER_LABEL[row.type]}
                    </Badge>
                    {voided && <span className="ml-2 text-xs no-underline">voided</span>}
                  </Td>
                  <Td>
                    {[row.note, row.method && METHOD_LABEL[row.method]].filter(Boolean).join(" · ")}
                    {row.sendId && sendHref && (
                      <>
                        {" · "}
                        <Link href={sendHref(row.sendId)} className="text-(--teal) underline">
                          receipt
                        </Link>
                      </>
                    )}
                    {row.voidReason && <span className="block text-xs">Void reason: {row.voidReason}</span>}
                  </Td>
                  <Td align="right">{increases ? formatTk(Math.abs(row.amount)) : ""}</Td>
                  <Td align="right">{!increases ? formatTk(Math.abs(row.amount)) : ""}</Td>
                  <Td align="right" className="font-semibold">
                    {row.balance === null ? "" : formatTk(row.balance)}
                  </Td>
                  {actions && <Td align="right">{!voided && actions(row)}</Td>}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function Summary({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-(--paper) p-3">
      <p className="text-xs text-(--muted)">{label}</p>
      <p className={`tabular-nums ${strong ? "text-lg font-semibold text-(--teal)" : "font-medium"}`}>
        {formatTk(value)}
      </p>
    </div>
  );
}
