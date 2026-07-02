import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaInitialized?: boolean;
};

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaInitialized) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    prismaInstance = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
    });

    globalForPrisma.prisma = prismaInstance;
    globalForPrisma.prismaInitialized = true;
  }

  return globalForPrisma.prisma;
}

// Lazy export - only initialize when actually used
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    return client[prop as keyof PrismaClient];
  },
});
