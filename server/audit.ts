import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "./db";

type AuditInput = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value));
}

/** Record who did what. Pass the transaction client when inside db.$transaction. */
export async function logAudit(input: AuditInput, tx: Tx | typeof db = db) {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: toJson(input.before),
      after: toJson(input.after),
    },
  });
}
