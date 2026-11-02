import type { Metadata } from "next";
import { Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { getActivityLog } from "@/server/modules/reports/queries";

export const metadata: Metadata = { title: "Activity log" };

export default async function ActivityLogPage() {
  const logs = await getActivityLog();

  return (
    <>
      <PageHeader title="Activity log" description="The latest 200 actions." />
      <Card>
        {logs.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Record</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
                  <Td>{log.user?.name ?? "-"}</Td>
                  <Td className="font-mono text-xs">{log.action}</Td>
                  <Td className="text-(--muted)">
                    {log.entity}
                    {log.entityId && ` #${log.entityId.slice(-8)}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
