import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const result = await prisma.song.deleteMany({});
console.log(`삭제된 곡 수: ${result.count}`);

await prisma.$disconnect();
