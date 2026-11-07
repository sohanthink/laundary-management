import Link from "next/link";
import { DateRangeForm, quickRanges } from "@/components/date-range-form";
import { LinkButton } from "@/components/ui/link-button";
import { Badge, Card, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui/layout";
import { endOfLocalDay, formatDateTime, rangeFromParams, startOfLocalDay } from "@/server/dates";
import { getT } from "@/server/i18n";
import { formatMoney } from "@/server/money";
import { getDashboard, getMoneySummary } from "@/server/modules/dashboard/queries";

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin/overview">) {
  const sp = await searchParams;
  const thisMonth = quickRanges().find((r) => r.key === "month")!;
  const range = rangeFromParams(sp.from ?? thisMonth.from, sp.to ?? thisMonth.to);
  const [d, money] = await Promise.all([
    getDashboard(),
    getMoneySummary(startOfLocalDay(range.from), endOfLocalDay(range.to)),
  ]);
  const t = await getT();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's picture of pieces, money and activity."
        actions={
          <>
            <LinkButton href="/admin/send" variant="primary">
              Send
            </LinkButton>
            <LinkButton href="/admin/collect">Collect</LinkButton>
            <LinkButton href="/admin/payments">Payment</LinkButton>
          </>
        }
      />

      <Card title="Earnings and profit" className="mb-6">
        <div className="mb-4">
          <DateRangeForm from={range.from} to={range.to} />
        </div>
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Hotels" value={formatMoney(money.hotelEarned)} hint={`${t("Received")} ${formatMoney(money.hotelReceived)}`} />
          <Stat label="Walk-in customers" value={formatMoney(money.walkInEarned)} hint={`${t("Received")} ${formatMoney(money.walkInReceived)}`} />
          <Stat label="Expenses" value={formatMoney(money.expenses)} tone="warn" />
          <Stat
            label="Estimated profit"
            value={formatMoney(money.estimatedProfit)}
            hint={`${t("Cash profit")} ${formatMoney(money.cashProfit)}`}
            tone={money.estimatedProfit >= 0 ? "good" : "warn"}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th />
              <Th align="right">Earned (charged)</Th>
              <Th align="right">Received (cash in)</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>{t("Hotels")}</Td>
              <Td align="right">{formatMoney(money.hotelEarned)}</Td>
              <Td align="right">{formatMoney(money.hotelReceived)}</Td>
            </tr>
            <tr>
              <Td>{t("Walk-in customers")}</Td>
              <Td align="right">{formatMoney(money.walkInEarned)}</Td>
              <Td align="right">{formatMoney(money.walkInReceived)}</Td>
            </tr>
            <tr className="font-semibold">
              <Td>{t("Revenue")}</Td>
              <Td align="right">{formatMoney(money.revenue)}</Td>
              <Td align="right">{formatMoney(money.received)}</Td>
            </tr>
            <tr>
              <Td>{t("Expenses")}</Td>
              <Td align="right">−{formatMoney(money.expenses)}</Td>
              <Td align="right">−{formatMoney(money.expenses)}</Td>
            </tr>
            <tr className="text-base font-bold">
              <Td>{t("Profit")}</Td>
              <Td align="right" className={money.estimatedProfit >= 0 ? "text-emerald-700" : "text-red-600"}>
                {formatMoney(money.estimatedProfit)}
              </Td>
              <Td align="right" className={money.cashProfit >= 0 ? "text-emerald-700" : "text-red-600"}>
                {formatMoney(money.cashProfit)}
              </Td>
            </tr>
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-(--muted)">
          {t("Earned counts everything charged in the period, paid or not. Received counts only money that came in. The difference is unpaid dues.")}
        </p>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Total due (all hotels)" value={formatMoney(d.totalDue)} tone={d.totalDue > 0 ? "warn" : "good"} />
        <Stat label="Sent this month" value={formatMoney(d.month.sendsTotal)} hint={`${d.month.sendsCount} ${t(d.month.sendsCount === 1 ? "send" : "sends")}`} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Your pieces at hotels" value={<Link href="/admin/tracking">{d.pieces.atHotels}</Link>} />
        <Stat label="Their items with us" value={<Link href="/admin/tracking">{d.pieces.itemsWithUs}</Link>} />
        <Stat label="Pieces sent this month" value={d.pieces.sentThisMonth} />
        <Stat label="Returned this month" value={d.pieces.returnedThisMonth} />
        <Stat
          label="Rejected this month"
          value={d.pieces.rejectedThisMonth}
          tone={d.pieces.rejectedThisMonth > 0 ? "warn" : "default"}
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
                      {formatMoney(h.due)}
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
                    <Td align="right">{formatMoney(s.total)}</Td>
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
