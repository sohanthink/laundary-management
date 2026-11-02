import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { TimelineView } from "../../timeline-view";

export const metadata: Metadata = { title: "Customer audit" };

export default async function CustomerAuditPage({ params, searchParams }: PageProps<"/admin/audit/customers/[id]">) {
  await requirePermission("report:view");
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: { user: true, hotels: { select: { id: true } } },
  });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={`Audit · ${customer.user.name}`}
        description="All activity across this customer's hotels."
        actions={
          <>
            <PrintButton />
            <LinkButton href={`/admin/customers/${customer.id}`}>Customer</LinkButton>
          </>
        }
      />
      <TimelineView hotelIds={customer.hotels.map((h) => h.id)} searchParams={await searchParams} showHotel />
    </>
  );
}
