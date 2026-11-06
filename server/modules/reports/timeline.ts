import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { endOfDhakaDay, startOfDhakaDay } from "@/server/dates";
import { METHOD_LABEL } from "@/server/labels";
import type { StatementRange } from "@/server/modules/ledger/statement";

export type TimelineKind = "SEND" | "COLLECT" | "PAYMENT" | "ADJUSTMENT";

export type TimelineEvent = {
  id: string;
  date: Date;
  kind: TimelineKind;
  hotelName: string;
  title: string;
  details: string;
  amount: number | null;
  voided: boolean;
  href?: string;
};

type CollectEvent = TimelineEvent & { parts: string[] };

export async function getTimeline(hotelIds: string[], range: StatementRange, kinds?: TimelineKind[]) {
  await requirePermission("report:view");
  const from = startOfDhakaDay(range.from);
  const to = endOfDhakaDay(range.to);
  const want = (k: TimelineKind) => !kinds || kinds.length === 0 || kinds.includes(k);
  const hotelFilter = { hotelId: { in: hotelIds } };
  const created = { createdAt: { gte: from, lt: to } };

  const [sends, movements, itemMovements, ledger] = await Promise.all([
    want("SEND")
      ? db.send.findMany({
          where: { ...hotelFilter, ...created },
          include: {
            hotel: true,
            lines: { include: { product: true } },
            itemLines: { include: { serviceItem: true } },
          },
        })
      : [],
    want("COLLECT")
      ? db.stockMovement.findMany({
          where: { ...hotelFilter, ...created, type: { in: ["RETURN", "REJECT", "LOST", "DAMAGED"] } },
          include: { hotel: true, product: true },
        })
      : [],
    want("COLLECT")
      ? db.hotelItemMovement.findMany({
          where: { ...hotelFilter, ...created, type: "COLLECTED" },
          include: { hotel: true, serviceItem: true },
        })
      : [],
    want("PAYMENT") || want("ADJUSTMENT") || want("COLLECT")
      ? db.ledgerEntry.findMany({
          where: { ...hotelFilter, date: { gte: from, lt: to }, type: { in: ["PAYMENT", "ADJUSTMENT"] } },
          include: { hotel: true },
        })
      : [],
  ]);

  const events: TimelineEvent[] = [];

  for (const s of sends) {
    events.push({
      id: `send-${s.id}`,
      date: s.createdAt,
      kind: "SEND",
      hotelName: s.hotel.name,
      title: "Sent",
      details: [
        ...s.lines.map((l) => `${l.quantity} ${l.product.name}`),
        ...s.itemLines.map((l) => `${l.quantity} ${l.serviceItem.name} (their item, washed)`),
      ].join(", "),
      amount: s.total,
      voided: s.status === "VOIDED",
      href: `/admin/send/${s.id}`,
    });
  }

  const collects = new Map<string, CollectEvent>();
  const collectFor = (batchId: string, date: Date, hotelName: string) => {
    const existing = collects.get(batchId);
    if (existing) return existing;
    const event: CollectEvent = {
      id: `collect-${batchId}`,
      date,
      kind: "COLLECT",
      hotelName,
      title: "Collected",
      details: "",
      amount: null,
      voided: false,
      parts: [],
    };
    collects.set(batchId, event);
    return event;
  };

  for (const m of movements) {
    const event = collectFor(m.batchId, m.createdAt, m.hotel?.name ?? "");
    const label = m.type === "RETURN" ? "returned" : m.type === "REJECT" ? "rejected" : m.type.toLowerCase();
    event.parts.push(`${m.quantity} ${m.product.name} ${label}`);
  }
  for (const m of itemMovements) {
    collectFor(m.batchId, m.createdAt, m.hotel.name).parts.push(`${m.quantity} ${m.serviceItem.name} picked up to wash`);
  }

  for (const e of ledger) {
    if (e.batchId && want("COLLECT")) {
      const event = collectFor(e.batchId, e.date, e.hotel.name);
      if (e.status === "ACTIVE") event.amount = e.amount;
      continue;
    }
    const kind = e.type === "PAYMENT" ? "PAYMENT" : "ADJUSTMENT";
    if (!want(kind)) continue;
    events.push({
      id: `ledger-${e.id}`,
      date: e.date,
      kind,
      hotelName: e.hotel.name,
      title: e.type === "PAYMENT" ? `Payment (${METHOD_LABEL[e.method ?? "CASH"]})` : "Adjustment",
      details: e.note ?? "",
      amount: e.amount,
      voided: e.status === "VOIDED",
    });
  }

  for (const event of collects.values()) {
    const { parts, ...rest } = event;
    events.push({ ...rest, details: parts.join(", ") || "Credit for rejected pieces" });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
