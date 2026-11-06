import Link from "next/link";
import { Card, Empty, PageHeader, Stat } from "@/components/ui/layout";
import { formatMoney } from "@/server/money";
import { getOwnerDashboard } from "@/server/modules/portal/queries";

export default async function PortalHomePage() {
  const { user, rows, totalDue } = await getOwnerDashboard();

  return (
    <>
      <PageHeader title={`Hello, ${user.name}`} description="Your hotels, deliveries and dues." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Total due" value={formatMoney(totalDue)} tone={totalDue > 0 ? "warn" : "good"} />
        <Stat label="Hotels" value={rows.length} />
      </div>
      {rows.length === 0 ? (
        <Card>
          <Empty>No hotels are linked to your account yet.</Empty>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ hotel, due, piecesHeld }) => (
            <Link
              key={hotel.id}
              href={`/portal/hotels/${hotel.id}`}
              className="rounded-3xl border border-(--line) bg-white p-6 transition hover:border-(--teal)"
            >
              <p className="text-lg font-semibold text-(--ink)">{hotel.name}</p>
              <p className="text-sm text-(--muted)">{hotel.location}</p>
              <div className="mt-4 flex gap-8 text-sm">
                <div>
                  <p className="text-(--muted)">Due</p>
                  <p className="text-xl font-semibold text-(--teal)">{formatMoney(due)}</p>
                </div>
                <div>
                  <p className="text-(--muted)">Our pieces with you</p>
                  <p className="text-xl font-semibold">{piecesHeld}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
