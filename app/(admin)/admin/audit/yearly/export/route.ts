import { getCurrentUser } from "@/server/auth/dal";
import { can } from "@/server/auth/permissions";
import { currentYear } from "@/server/dates";
import { getYearlyAudit, yearlyAuditCsv } from "@/server/modules/reports/queries";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Unauthorized", { status: 401 });
  if (!can(user, "report:view")) return new Response("Forbidden", { status: 403 });

  const param = Number(new URL(request.url).searchParams.get("year"));
  const year = Number.isInteger(param) && param > 2000 && param < 3000 ? param : currentYear();
  const csv = yearlyAuditCsv(year, await getYearlyAudit(year));

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="an-nafi-yearly-audit-${year}.csv"`,
    },
  });
}
