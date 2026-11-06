"use server";

import { after } from "next/server";
import { z } from "zod";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { getT } from "@/server/i18n";
import { generateTempPassword, hashPassword } from "@/server/auth/password";
import { deleteAllSessionsForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { isEmailConfigured, sendEmail } from "@/server/email";
import { credentialsEmail } from "@/server/emails";
import { checkbox, id, optionalText, parseForm, text, type ActionState } from "@/server/forms";
import { done, toActionError } from "@/server/modules/shared";
import { saveUpload } from "@/server/uploads";

const customerSchema = z.object({
  name: text("Name"),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: text("Phone"),
  address: optionalText,
});

function emailCredentials(name: string, email: string, tempPassword: string, reset = false) {
  after(() => sendEmail({ to: email, ...credentialsEmail({ name, email, tempPassword, reset }) }));
}

async function emailNote(email: string) {
  const t = await getT();
  return isEmailConfigured()
    ? t("Login details are being emailed to {email}.", { email })
    : t("Email is not set up yet, so share these login details yourself.");
}

export async function createCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const parsed = parseForm(customerSchema, formData);
  if (!parsed.success) return parsed.state;
  const { name, email, phone, address } = parsed.data;
  const tempPassword = generateTempPassword();

  try {
    const photoPath = await saveUpload(formData.get("photo"), "customers");
    const passwordHash = await hashPassword(tempPassword);
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, role: "HOTEL_OWNER", passwordHash, mustChangePassword: true },
      });
      const customer = await tx.customer.create({
        data: { userId: user.id, phone, address, photoPath },
      });
      await logAudit(
        { userId: admin.id, action: "customer.create", entity: "Customer", entityId: customer.id, after: { name, email, phone } },
        tx,
      );
    });
  } catch (error) {
    return toActionError(error);
  }

  emailCredentials(name, email, tempPassword);
  return done(
    `${(await getT())("Customer created.")} ${await emailNote(email)} ${(await getT())("Temporary password: {password}", { password: tempPassword })}`,
  );
}

const updateCustomerSchema = customerSchema.extend({ id });

export async function updateCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const parsed = parseForm(updateCustomerSchema, formData);
  if (!parsed.success) return parsed.state;
  const { id: customerId, name, email, phone, address } = parsed.data;

  try {
    const before = await db.customer.findUnique({ where: { id: customerId }, include: { user: true } });
    if (!before) return { error: "Customer not found." };
    const photoPath = await saveUpload(formData.get("photo"), "customers");
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: before.userId }, data: { name, email } });
      await tx.customer.update({
        where: { id: customerId },
        data: { phone, address, ...(photoPath ? { photoPath } : {}) },
      });
      await logAudit(
        {
          userId: admin.id,
          action: "customer.update",
          entity: "Customer",
          entityId: customerId,
          before: { name: before.user.name, email: before.user.email, phone: before.phone },
          after: { name, email, phone },
        },
        tx,
      );
    });
  } catch (error) {
    return toActionError(error);
  }
  return done("Customer updated.");
}

export async function resetOwnerPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const customerId = String(formData.get("id") ?? "");
  const customer = await db.customer.findUnique({ where: { id: customerId }, include: { user: true } });
  if (!customer) return { error: "Customer not found." };

  const tempPassword = generateTempPassword();
  await db.user.update({
    where: { id: customer.userId },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await deleteAllSessionsForUser(customer.userId);
  await logAudit({ userId: admin.id, action: "customer.resetPassword", entity: "Customer", entityId: customerId });

  emailCredentials(customer.user.name, customer.user.email, tempPassword, true);
  const t = await getT();
  return done(
    `${t("Password reset.")} ${await emailNote(customer.user.email)} ${t("Temporary password: {password}", { password: tempPassword })}`,
  );
}

const activeSchema = z.object({ id, isActive: checkbox });

export async function setCustomerLogin(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const parsed = parseForm(activeSchema, formData);
  if (!parsed.success) return parsed.state;
  const customer = await db.customer.findUnique({ where: { id: parsed.data.id } });
  if (!customer) return { error: "Customer not found." };

  await db.user.update({ where: { id: customer.userId }, data: { isActive: parsed.data.isActive } });
  if (!parsed.data.isActive) await deleteAllSessionsForUser(customer.userId);
  await logAudit({
    userId: admin.id,
    action: parsed.data.isActive ? "customer.enableLogin" : "customer.disableLogin",
    entity: "Customer",
    entityId: customer.id,
  });
  return done(parsed.data.isActive ? "Login enabled." : "Login disabled and signed out everywhere.");
}

const hotelSchema = z.object({
  name: text("Hotel name"),
  location: text("Location"),
  taxNo: optionalText,
  tradeLicense: optionalText,
  email: z
    .union([z.literal(""), z.email("Enter a valid email")])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  phone: optionalText,
});

export async function createHotel(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const parsed = parseForm(hotelSchema.extend({ customerId: id }), formData);
  if (!parsed.success) return parsed.state;

  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return { error: "Customer not found." };

  const hotel = await db.hotel.create({ data: parsed.data });
  await logAudit({ userId: admin.id, action: "hotel.create", entity: "Hotel", entityId: hotel.id, after: hotel });
  return done((await getT())("Hotel \"{name}\" added. Next, set up its agreed products and prices.", { name: hotel.name }));
}

export async function updateHotel(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requirePermission("customer:manage");
  const parsed = parseForm(hotelSchema.extend({ id, isActive: checkbox }), formData);
  if (!parsed.success) return parsed.state;
  const { id: hotelId, ...data } = parsed.data;

  const before = await db.hotel.findUnique({ where: { id: hotelId } });
  if (!before) return { error: "Hotel not found." };
  const after = await db.hotel.update({ where: { id: hotelId }, data });
  await logAudit({ userId: admin.id, action: "hotel.update", entity: "Hotel", entityId: hotelId, before, after });
  return done("Hotel updated.");
}
