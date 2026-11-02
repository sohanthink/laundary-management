import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui/layout";
import { formatDateTime } from "@/server/dates";
import { formatTk } from "@/server/money";
import { getDashboard } from "@/server/modules/dashboard/queries";

export default async function AdminDashboardPage() {
  const d = await getDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's picture of stock, money and activity."
        actions={
          <>
            <LinkButton href="/admin/send" variant="primary">
              Send
            </LinkButton>
            <LinkButton href="/admin/return">Return</LinkButton>
            <LinkButton href="/admin/payments">Payment</LinkButton>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total due (all hotels)" value={formatTk(d.totalDue)} tone={d.totalDue > 0 ? "warn" : "good"} />
        <Stat label="Sent this month" value={formatTk(d.month.sendsTotal)} hint={`${d.month.sendsCount} ${d.month.sendsCount === 1 ? "send" : "sends"}`} />
        <Stat label="Payments this month" value={formatTk(d.month.income)} tone="good" />
        <Stat
          label="Profit estimate this month"
          value={formatTk(d.month.net)}
          hint={`Expenses ${formatTk(d.month.expenses)}`}
          tone={d.month.net >= 0 ? "good" : "warn"}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Owned" value={d.owned} />
        <Stat label="Available" value={d.stock.AVAILABLE} />
        <Stat label="At hotels" value={d.stock.AT_HOTEL} />
        <Stat label="Washing" value={d.stock.WASHING} />
        <Stat
          label="Open washing orders"
          value={<Link href="/admin/services">{d.openServices}</Link>}
          tone={d.openServices > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Highest dues">
          {d.topDue.length === 0 ? (
            <Empty>No hotel owes anything.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Hotel</Th>
                  <Th>Owner</Th>
                  <Th align="right">Due</Th>
                </tr>
              </thead>
              <tbody>
                {d.topDue.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <Link href={`/admin/hotels/${h.id}`} className="font-medium hover:text-(--teal)">
                        {h.name}
                      </Link>
                    </Td>
                    <Td>{h.customer.user.name}</Td>
                    <Td align="right" className="font-semibold">
                      {formatTk(h.due)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Latest sends" actions={<LinkButton href="/admin/send/history" size="sm" variant="ghost">All</LinkButton>}>
          {d.recentSends.length === 0 ? (
            <Empty>No sends yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Hotel</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {d.recentSends.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link href={`/admin/send/${s.id}`} className="hover:text-(--teal)">
                        {formatDateTime(s.createdAt)}
                      </Link>
                    </Td>
                    <Td>
                      {s.hotel.name} {s.status === "VOIDED" && <Badge tone="bad">Voided</Badge>}
                    </Td>
                    <Td align="right">{formatTk(s.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card
          title="Latest activity"
          className="lg:col-span-2"
          actions={<LinkButton href="/admin/audit/log" size="sm" variant="ghost">Activity log</LinkButton>}
        >
          {d.recentActivity.length === 0 ? (
            <Empty>Nothing yet.</Empty>
          ) : (
            <ul className="divide-y divide-(--line) text-sm">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium">{a.user?.name ?? "System"}</span>{" "}
                    <span className="font-mono text-xs text-(--muted)">{a.action}</span>
                  </span>
                  <span className="text-(--muted)">{formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
