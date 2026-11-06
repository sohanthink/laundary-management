import type { Role } from "@prisma/client";

// Version 2 adds roles here (MANAGER, ACCOUNTANT, HOTEL_STAFF, ...).
// Code checks permissions, never role names.
export const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: ["*"],
  HOTEL_OWNER: [
    "portal:access",
    "own:hotel:view",
    "own:statement:view",
    "own:profile:edit",
  ],
};

export type Permission =
  | "admin:access"
  | "catalog:manage"
  | "customer:manage"
  | "price:manage"
  | "send:create"
  | "send:void"
  | "return:create"
  | "payment:manage"
  | "expense:manage"
  | "report:view"
  | "portal:access"
  | "own:hotel:view"
  | "own:statement:view"
  | "own:profile:edit";

export function can(user: { role: Role }, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[user.role];
  return granted.includes("*") || granted.includes(permission);
}

export function homePathFor(user: { role: Role }) {
  return can(user, "admin:access") ? "/admin" : "/portal";
}
