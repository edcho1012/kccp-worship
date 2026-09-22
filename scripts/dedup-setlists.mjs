import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const setlists = await prisma.setlist.findMany({
  include: { songs: { select: { songId: true }, orderBy: { order: "asc" } } },
  orderBy: { createdAt: "asc" }, // 먼저 생긴 걸 남기려고
});

// date + title + (정렬된) 곡 id 목록을 키로 묶어서 중복 찾기
const groups = new Map();
for (const s of setlists) {
  const songIds = s.songs.map((x) => x.songId).sort().join(",");
  const key = `${s.date ? s.date.toISOString() : "null"}|${s.title ?? "null"}|${songIds}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s.id);
}

const idsToDelete = [];
for (const ids of groups.values()) {
  if (ids.length > 1) {
    idsToDelete.push(...ids.slice(1)); // 첫 번째(가장 먼저 생긴 것)만 남기고 나머지 삭제
  }
}

console.log(`중복 그룹 수: ${[...groups.values()].filter((g) => g.length > 1).length}`);
console.log(`삭제할 콘티 수: ${idsToDelete.length}`);

if (idsToDelete.length > 0) {
  const result = await prisma.setlist.deleteMany({ where: { id: { in: idsToDelete } } });
  console.log(`실제로 삭제된 콘티 수: ${result.count}`);
}

await prisma.$disconnect();
