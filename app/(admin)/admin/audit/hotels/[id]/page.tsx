import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { TimelineView } from "../../timeline-view";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Hotel audit") };
}

export default async function HotelAuditPage({ params, searchParams }: PageProps<"/admin/audit/hotels/[id]">) {
  await requirePermission("report:view");
  const { id } = await params;
  const hotel = await db.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  return (
    <>
      <PageHeader
        title={`Audit · ${hotel.name}`}
        description="Every send, collection and payment for this hotel."
        actions={
          <>
            <PrintButton />
            <LinkButton href={`/admin/hotels/${hotel.id}`}>Hotel profile</LinkButton>
          </>
        }
      />
      <TimelineView hotelIds={[hotel.id]} searchParams={await searchParams} />
    </>
  );
}
