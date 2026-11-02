import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse one client across hot reloads in development so we don't exhaust connections.
export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
