import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaInitialized?: boolean;
};

let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma || !globalForPrisma.prismaInitialized) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Only log in development to avoid production noise
    if (process.env.NODE_ENV !== "production") {
      console.log("Database URL loaded:", connectionString.replace(/:[^:@]+@/, ":****@"));
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

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    return client[prop as keyof PrismaClient];
  },
});
