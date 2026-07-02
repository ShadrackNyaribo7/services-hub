import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Only log in development to avoid production noise
if (process.env.NODE_ENV !== "production") {
  console.log("Database URL loaded:", connectionString.replace(/:[^:@]+@/, ":****@"));
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}