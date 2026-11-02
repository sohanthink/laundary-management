"use server";

import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db";
import { optionalText, parseForm, text, type ActionState } from "@/server/forms";
import { done, toActionError } from "@/server/modules/shared";
import { saveUpload } from "@/server/uploads";

const profileSchema = z.object({
  name: text("Name"),
  phone: text("Phone"),
  address: optionalText,
});

/** Owners can edit their own contact details. Login email is changed by the admin. */
export async function updateOwnProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("own:profile:edit");
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.success) return parsed.state;
  const { name, phone, address } = parsed.data;

  try {
    const customer = await db.customer.findUnique({ where: { userId: user.id } });
    if (!customer) return { error: "Profile not found." };
    const photoPath = await saveUpload(formData.get("photo"), "customers");
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name } }),
      db.customer.update({
        where: { id: customer.id },
        data: { phone, address, ...(photoPath ? { photoPath } : {}) },
      }),
    ]);
    await logAudit({ userId: user.id, action: "profile.update", entity: "Customer", entityId: customer.id, after: { name, phone, address } });
  } catch (error) {
    return toActionError(error);
  }
  return done("Profile saved.");
}
