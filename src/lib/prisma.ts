import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Next.js 개발 모드에서 hot reload 할 때마다 새 PrismaClient가 생기는 것을 방지
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Prisma 7부터는 드라이버 어댑터가 필수라, Neon용 어댑터를 통해 연결함 (pooled URL 사용)
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
