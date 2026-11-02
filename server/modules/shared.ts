import "server-only";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/server/forms";
import { UploadError } from "@/server/uploads";

/** An error whose message is safe to show to the user. */
export class BusinessError extends Error {}

/** Refresh every page so numbers (stock, due) are never stale after a write. */
export function revalidateAll() {
  revalidatePath("/", "layout");
}

export function done(message: string): ActionState {
  revalidateAll();
  return { ok: true, message };
}

/** Turns known errors into a form message; re-throws anything unexpected. */
export function toActionError(error: unknown): ActionState {
  if (error instanceof BusinessError || error instanceof UploadError) {
    return { error: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { error: "That name or email is already in use." };
    if (error.code === "P2034") return { error: "Someone else changed this at the same time. Please try again." };
  }
  throw error;
}

export const SERIALIZABLE = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;
