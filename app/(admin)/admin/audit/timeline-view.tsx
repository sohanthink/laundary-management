import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Badge, Card, Empty, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime, rangeFromParams } from "@/server/dates";
import { formatTk } from "@/server/money";
import { getTimeline, type TimelineKind } from "@/server/modules/reports/timeline";

const KINDS: { value: TimelineKind; label: string }[] = [
  { value: "SEND", label: "Sends" },
  { value: "COLLECT", label: "Collections" },
  { value: "PAYMENT", label: "Payments" },
  { value: "ADJUSTMENT", label: "Adjustments" },
];

const TONE: Record<TimelineKind, "info" | "default" | "bad" | "warn" | "good"> = {
  SEND: "info",
  COLLECT: "default",
  PAYMENT: "good",
  ADJUSTMENT: "warn",
};

export async function TimelineView({
  hotelIds,
  searchParams,
  showHotel,
}: {
  hotelIds: string[];
  searchParams: Record<string, string | string[] | undefined>;
  showHotel?: boolean;
}) {
  const range = rangeFromParams(searchParams.from, searchParams.to);
  const kind = KINDS.find((k) => k.value === searchParams.kind)?.value;
  const events = await getTimeline(hotelIds, range, kind ? [kind] : undefined);

  return (
    <Card
      title={`${events.length} events`}
      actions={
        <form className="flex flex-wrap items-end gap-3 no-print">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-(--muted)">Type</span>
            <select name="kind" defaultValue={kind ?? ""} className={`${inputClass} h-10`}>
              <option value="">Everything</option>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-(--muted)">From</span>
            <input type="date" name="from" defaultValue={range.from} className={`${inputClass} h-10`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-(--muted)">To</span>
            <input type="date" name="to" defaultValue={range.to} className={`${inputClass} h-10`} />
          </label>
          <button type="submit" className={buttonClass("secondary", "sm", "h-10")}>
            Apply
          </button>
        </form>
      }
    >
      {events.length === 0 ? (
        <Empty>Nothing happened in this period.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Type</Th>
              {showHotel && <Th>Hotel</Th>}
              <Th>Details</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className={e.voided ? "text-(--muted) line-through" : ""}>
                <Td className="whitespace-nowrap">
                  {e.href ? (
                    <Link href={e.href} className="hover:text-(--teal)">
                      {formatDateTime(e.date)}
                    </Link>
                  ) : (
                    formatDateTime(e.date)
                  )}
                </Td>
                <Td>
                  <Badge tone={TONE[e.kind]}>{e.title}</Badge>
                </Td>
                {showHotel && <Td>{e.hotelName}</Td>}
                <Td>{e.details}</Td>
                <Td align="right" className="font-medium">
                  {e.amount === null ? "" : formatTk(e.amount)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
