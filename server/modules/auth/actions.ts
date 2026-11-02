"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requireUser, getSession } from "@/server/auth/dal";
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from "@/server/auth/password";
import { homePathFor } from "@/server/auth/permissions";
import {
  createSession,
  deleteAllSessionsForUser,
  deleteCurrentSession,
} from "@/server/auth/session";
import { db } from "@/server/db";
import { parseForm, type ActionState } from "@/server/forms";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INVALID = "Invalid email or password.";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return parsed.state;
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await verifyAgainstDummy(password);
    return { error: INVALID };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `Too many failed attempts. Try again after ${LOCK_MINUTES} minutes.` };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    return {
      error: lock
        ? `Too many failed attempts. Try again after ${LOCK_MINUTES} minutes.`
        : INVALID,
    };
  }

  if (!user.isActive) {
    return { error: "This account is disabled. Please contact the admin." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  await createSession(user.id);
  await logAudit({ userId: user.id, action: "login", entity: "User", entityId: user.id });

  redirect(user.mustChangePassword ? "/change-password" : homePathFor(user));
}

export async function logout() {
  await deleteCurrentSession();
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Use at least 8 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export async function changePassword(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser({ allowPasswordChange: true });
  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.success) return parsed.state;

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { fieldErrors: { currentPassword: ["Current password is wrong"] } };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });
  const session = await getSession();
  await deleteAllSessionsForUser(user.id, session?.sessionId);
  await logAudit({
    userId: user.id,
    action: "password.change",
    entity: "User",
    entityId: user.id,
  });

  redirect(homePathFor(user));
}
