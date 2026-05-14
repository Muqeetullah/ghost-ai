import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(databaseUrl: string) {
  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    });
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
