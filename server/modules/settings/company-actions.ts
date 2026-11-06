"use server";

import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import type { ActionState } from "@/server/forms";
import { done } from "@/server/modules/shared";
import { COMPANY_FIELDS } from "./company";

export async function saveCompany(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("admin:access");
  const values = COMPANY_FIELDS.map((f) => ({
    key: f.key,
    value: String(formData.get(f.key) ?? "").trim().slice(0, 1000),
  }));
  await db.$transaction(
    values.map((v) =>
      db.setting.upsert({ where: { key: v.key }, update: { value: v.value }, create: v }),
    ),
  );
  await logAudit({ userId: user.id, action: "settings.company", entity: "Setting", after: values });
  return done("Company details saved.");
}
