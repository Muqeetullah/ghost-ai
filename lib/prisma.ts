import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient(databaseUrl: string) {
  if (isAccelerateUrl(databaseUrl)) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    }).$extends(withAccelerate());
  }

  const adapter = new PrismaPg({
    connectionString: normalizeRuntimePgUrl(databaseUrl),
  });

  return new PrismaClient({
    adapter,
  }).$extends(withAccelerate());
}

function isAccelerateUrl(databaseUrl: string) {
  return databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
}

function normalizeRuntimePgUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.hostname === "db.prisma.io") {
    parsedUrl.hostname = "pooled.db.prisma.io";
  }

  if (
    (parsedUrl.hostname === "db.prisma.io" ||
      parsedUrl.hostname === "pooled.db.prisma.io") &&
    parsedUrl.searchParams.get("sslmode") === "require" &&
    !parsedUrl.searchParams.has("uselibpqcompat")
  ) {
    parsedUrl.searchParams.set("uselibpqcompat", "true");
  }

  return parsedUrl.toString();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient(connectionString);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
