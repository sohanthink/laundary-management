import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { daysBetween, endOfDhakaDay, startOfDhakaDay, startOfYear } from "@/server/dates";
import { dueFromSums } from "@/server/ledger";
import { METHOD_LABEL, MOVEMENT_LABEL } from "@/server/labels";
import { getSumsByHotel } from "@/server/modules/ledger/core";
import type { StatementRange } from "@/server/modules/ledger/statement";
import { fifoOutstanding } from "@/server/stock";

// ---------- Client audit timeline ----------

export type TimelineKind = "SEND" | "RETURN" | "WRITE_OFF" | "SERVICE" | "PAYMENT" | "ADJUSTMENT";

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

export async function getTimeline(hotelIds: string[], range: StatementRange, kinds?: TimelineKind[]) {
  await requirePermission("report:view");
  const from = startOfDhakaDay(range.from);
  const to = endOfDhakaDay(range.to);
  const want = (k: TimelineKind) => !kinds || kinds.length === 0 || kinds.includes(k);
  const hotelFilter = { hotelId: { in: hotelIds } };

  const [sends, movements, services, ledger] = await Promise.all([
    want("SEND")
      ? db.send.findMany({
          where: { ...hotelFilter, createdAt: { gte: from, lt: to } },
          include: { hotel: true, lines: { include: { product: true } } },
        })
      : [],
    want("RETURN") || want("WRITE_OFF")
      ? db.stockMovement.findMany({
          where: {
            ...hotelFilter,
            createdAt: { gte: from, lt: to },
            type: {
              in: [
                ...(want("RETURN") ? (["RETURN"] as const) : []),
                ...(want("WRITE_OFF") ? (["LOST", "DAMAGED"] as const) : []),
              ],
            },
          },
          include: { hotel: true, product: true },
        })
      : [],
    want("SERVICE")
      ? db.serviceOrder.findMany({
          where: { ...hotelFilter, receivedAt: { gte: from, lt: to } },
          include: { hotel: true, lines: { include: { serviceItem: true } } },
        })
      : [],
    want("PAYMENT") || want("ADJUSTMENT")
      ? db.ledgerEntry.findMany({
          where: {
            ...hotelFilter,
            date: { gte: from, lt: to },
            type: {
              in: [
                ...(want("PAYMENT") ? (["PAYMENT"] as const) : []),
                ...(want("ADJUSTMENT") ? (["ADJUSTMENT"] as const) : []),
              ],
            },
          },
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
      details: s.lines.map((l) => `${l.quantity} ${l.product.name}`).join(", "),
      amount: s.total,
      voided: s.status === "VOIDED",
      href: `/admin/send/${s.id}`,
    });
  }

  const batches = new Map<string, typeof movements>();
  for (const m of movements) {
    const list = batches.get(m.batchId) ?? [];
    list.push(m);
    batches.set(m.batchId, list);
  }
  for (const [batchId, list] of batches) {
    const first = list[0];
    const isReturn = first.type === "RETURN";
    events.push({
      id: `batch-${batchId}`,
      date: first.createdAt,
      kind: isReturn ? "RETURN" : "WRITE_OFF",
      hotelName: first.hotel?.name ?? "",
      title: isReturn ? "Returned" : MOVEMENT_LABEL[first.type],
      details:
        list.map((m) => `${m.quantity} ${m.product.name}`).join(", ") + (first.note ? ` · ${first.note}` : ""),
      amount: null,
      voided: false,
    });
  }

  for (const o of services) {
    events.push({
      id: `service-${o.id}`,
      date: o.receivedAt,
      kind: "SERVICE",
      hotelName: o.hotel.name,
      title: `Washing service (${o.status.toLowerCase()})`,
      details: o.lines.map((l) => `${l.quantity} ${l.serviceItem.name}`).join(", "),
      amount: o.status === "DELIVERED" ? o.total : null,
      voided: o.status === "CANCELLED",
      href: `/admin/services/${o.id}`,
    });
  }

  for (const e of ledger) {
    events.push({
      id: `ledger-${e.id}`,
      date: e.date,
      kind: e.type === "PAYMENT" ? "PAYMENT" : "ADJUSTMENT",
      hotelName: e.hotel.name,
      title: e.type === "PAYMENT" ? `Payment (${METHOD_LABEL[e.method ?? "CASH"]})` : "Adjustment",
      details: e.note ?? "",
      amount: e.amount,
      voided: e.status === "VOIDED",
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ---------- Yearly audit ----------

export async function getYearlyAudit(year: number) {
  await requirePermission("report:view");
  const from = startOfYear(year);
  const to = startOfYear(year + 1);

  const [hotels, openingSums, yearSums, sends, expenses] = await Promise.all([
    db.hotel.findMany({
      include: { customer: { include: { user: true } } },
      orderBy: [{ customer: { user: { name: "asc" } } }, { name: "asc" }],
    }),
    getSumsByHotel(db, { date: { lt: from } }),
    getSumsByHotel(db, { date: { gte: from, lt: to } }),
    db.send.findMany({
      where: { status: "ACTIVE", createdAt: { gte: from, lt: to } },
      include: { lines: true },
    }),
    db.expense.aggregate({ where: { paidAt: { gte: from, lt: to } }, _sum: { amount: true } }),
  ]);

  const discounts = new Map<string, { agreed: number; extra: number; pieces: number }>();
  for (const s of sends) {
    const d = discounts.get(s.hotelId) ?? { agreed: 0, extra: 0, pieces: 0 };
    for (const l of s.lines) {
      d.agreed += (l.basePriceSnapshot - l.agreedPriceSnapshot) * l.quantity;
      d.extra += l.extraDiscountPerPiece * l.quantity;
      d.pieces += l.quantity;
    }
    d.extra += s.wholeDiscount;
    discounts.set(s.hotelId, d);
  }

  const rows = hotels.map((h) => {
    const opening = dueFromSums(openingSums.get(h.id) ?? {});
    const sums = yearSums.get(h.id) ?? {};
    const charges = sums.CHARGE ?? 0;
    const payments = sums.PAYMENT ?? 0;
    const adjustments = sums.ADJUSTMENT ?? 0;
    const d = discounts.get(h.id) ?? { agreed: 0, extra: 0, pieces: 0 };
    return {
      hotelId: h.id,
      hotelName: h.name,
      customerName: h.customer.user.name,
      opening,
      charges,
      adjustments,
      payments,
      closing: opening + charges - payments + adjustments,
      agreedDiscount: d.agreed,
      extraDiscount: d.extra,
      piecesSent: d.pieces,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      opening: acc.opening + r.opening,
      charges: acc.charges + r.charges,
      adjustments: acc.adjustments + r.adjustments,
      payments: acc.payments + r.payments,
      closing: acc.closing + r.closing,
      agreedDiscount: acc.agreedDiscount + r.agreedDiscount,
      extraDiscount: acc.extraDiscount + r.extraDiscount,
      piecesSent: acc.piecesSent + r.piecesSent,
    }),
    { opening: 0, charges: 0, adjustments: 0, payments: 0, closing: 0, agreedDiscount: 0, extraDiscount: 0, piecesSent: 0 },
  );

  const expenseTotal = expenses._sum.amount ?? 0;
  return {
    rows,
    totals,
    income: totals.payments,
    expenses: expenseTotal,
    net: totals.payments - expenseTotal,
  };
}

export type YearlyAudit = Awaited<ReturnType<typeof getYearlyAudit>>;

export function yearlyAuditCsv(year: number, audit: YearlyAudit) {
  const tk = (p: number) => (p / 100).toFixed(2);
  const header = [
    "Customer",
    "Hotel",
    `Opening due (1 Jan ${year})`,
    "Charges",
    "Adjustments",
    "Payments",
    "Closing due",
    "Agreed discount",
    "Extra discount",
    "Pieces sent",
  ];
  const lines = audit.rows.map((r) => [
    r.customerName,
    r.hotelName,
    tk(r.opening),
    tk(r.charges),
    tk(r.adjustments),
    tk(r.payments),
    tk(r.closing),
    tk(r.agreedDiscount),
    tk(r.extraDiscount),
    String(r.piecesSent),
  ]);
  const t = audit.totals;
  lines.push([
    "TOTAL",
    "",
    tk(t.opening),
    tk(t.charges),
    tk(t.adjustments),
    tk(t.payments),
    tk(t.closing),
    tk(t.agreedDiscount),
    tk(t.extraDiscount),
    String(t.piecesSent),
  ]);
  lines.push([]);
  lines.push(["Income (payments received)", tk(audit.income)]);
  lines.push(["Expenses", tk(audit.expenses)]);
  lines.push(["Net", tk(audit.net)]);

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  return [header, ...lines].map((row) => row.map(escape).join(",")).join("\n");
}

// ---------- Long-held items ----------

export async function getLongHeld(minDays: number) {
  await requirePermission("report:view");
  const [sendMovements, outflows] = await Promise.all([
    db.stockMovement.findMany({
      where: { type: "SEND", send: { status: "ACTIVE" } },
      select: { hotelId: true, productId: true, quantity: true, createdAt: true },
    }),
    db.stockMovement.groupBy({
      by: ["hotelId", "productId"],
      where: { fromState: "AT_HOTEL", type: { not: "SEND_VOID" } },
      _sum: { quantity: true },
    }),
  ]);

  const outByKey = new Map(outflows.map((o) => [`${o.hotelId}:${o.productId}`, o._sum.quantity ?? 0]));
  const inByKey = new Map<string, { date: Date; quantity: number }[]>();
  for (const m of sendMovements) {
    const key = `${m.hotelId}:${m.productId}`;
    const list = inByKey.get(key) ?? [];
    list.push({ date: m.createdAt, quantity: m.quantity });
    inByKey.set(key, list);
  }

  const now = new Date();
  const found: { hotelId: string; productId: string; quantity: number; oldest: Date; days: number }[] = [];
  for (const [key, inflows] of inByKey) {
    const outstanding = fifoOutstanding(inflows, outByKey.get(key) ?? 0);
    const old = outstanding.filter((o) => daysBetween(o.date, now) >= minDays);
    if (old.length === 0) continue;
    const [hotelId, productId] = key.split(":");
    found.push({
      hotelId,
      productId,
      quantity: old.reduce((s, o) => s + o.quantity, 0),
      oldest: old[0].date,
      days: daysBetween(old[0].date, now),
    });
  }

  const [hotels, products] = await Promise.all([
    db.hotel.findMany({ where: { id: { in: found.map((f) => f.hotelId) } }, select: { id: true, name: true } }),
    db.product.findMany({ where: { id: { in: found.map((f) => f.productId) } }, select: { id: true, name: true } }),
  ]);
  const hotelName = new Map(hotels.map((h) => [h.id, h.name]));
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return found
    .map((f) => ({ ...f, hotelName: hotelName.get(f.hotelId) ?? "", productName: productName.get(f.productId) ?? "" }))
    .sort((a, b) => b.days - a.days);
}

// ---------- Activity log ----------

export async function getActivityLog(take = 200) {
  await requirePermission("report:view");
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true, email: true } } },
  });
}