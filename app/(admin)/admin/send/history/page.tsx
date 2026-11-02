import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { formatTk } from "@/server/money";
import { listSends } from "@/server/modules/send/queries";

export const metadata: Metadata = { title: "Send history" };

export default async function SendHistoryPage() {
  const sends = await listSends({ take: 100 });

  return (
    <>
      <PageHeader
        title="Send history"
        description="The latest 100 sends."
        actions={<LinkButton href="/admin/send" variant="primary">New send</LinkButton>}
      />
      <Card>
        {sends.length === 0 ? (
          <Empty>No sends yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Hotel</Th>
                <Th align="right">Products</Th>
                <Th align="right">Total</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {sends.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/admin/send/${s.id}`} className="font-medium hover:text-(--teal)">
                      {formatDateTime(s.createdAt)}
                    </Link>
                  </Td>
                  <Td>{s.hotel.name}</Td>
                  <Td align="right">{s._count.lines}</Td>
                  <Td align="right" className="font-semibold">
                    {formatTk(s.total)}
                  </Td>
                  <Td>{s.status === "VOIDED" ? <Badge tone="bad">Voided</Badge> : <Badge tone="good">Active</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
