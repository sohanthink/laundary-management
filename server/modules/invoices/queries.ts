import "server-only";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { getOwnerHotelIds, requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { endOfLocalDay, startOfLocalDay } from "@/server/dates";
import { getCompany } from "@/server/modules/settings/company";
import { buildInvoiceDraft } from "./build";

const invoiceInclude = {
  hotel: { include: { customer: { include: { user: true } } } },
  lines: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export function invoiceNumber(invoice: { number: number; year: number }) {
  return `${invoice.number}/${invoice.year}`;
}

export async function listInvoices(filter: {
  hotelId?: string;
  status?: InvoiceStatus;
  from: string;
  to: string;
}) {
  await requirePermission("payment:manage");
  const invoices = await db.invoice.findMany({
    where: {
      ...(filter.hotelId ? { hotelId: filter.hotelId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      issuedAt: { gte: startOfLocalDay(filter.from), lt: endOfLocalDay(filter.to) },
    },
    include: { hotel: true },
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });
  const sum = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.total, 0);
  return { invoices, unpaid: sum("UNPAID"), paid: sum("PAID") };
}

export async function getInvoicePreview(hotelId: string, from: string, to: string) {
  await requirePermission("payment:manage");
  return buildInvoiceDraft(db, hotelId, from, to);
}

export async function getInvoice(invoiceId: string) {
  await requirePermission("payment:manage");
  const [invoice, company] = await Promise.all([
    db.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude }),
    getCompany(),
  ]);
  return invoice ? { invoice, company } : null;
}

export async function listOwnerInvoices() {
  const user = await requirePermission("own:statement:view");
  const hotelIds = await getOwnerHotelIds(user.id);
  return db.invoice.findMany({
    where: { hotelId: { in: hotelIds }, status: { not: "VOIDED" } },
    include: { hotel: true },
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });
}

/** Returns the invoice only if it belongs to one of the owner's hotels. */
export async function getOwnerInvoice(invoiceId: string) {
  const user = await requirePermission("own:statement:view");
  const hotelIds = await getOwnerHotelIds(user.id);
  const [invoice, company] = await Promise.all([
    db.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude }),
    getCompany(),
  ]);
  if (!invoice || !hotelIds.includes(invoice.hotelId) || invoice.status === "VOIDED") return null;
  return { invoice, company };
}
