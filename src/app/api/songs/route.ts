import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const songs = await prisma.song.findMany({
    include: { _count: { select: { setlistSongs: true } } },
    orderBy: { titleKo: "asc" },
  });

  // 경배/찬양 x 빠른곡/느린곡 4분류로 그룹핑해서 반환
  const grouped: Record<string, typeof songs> = {
    "WORSHIP_SLOW": [],
    "WORSHIP_FAST": [],
    "PRAISE_SLOW": [],
    "PRAISE_FAST": [],
  };
  for (const song of songs) {
    grouped[`${song.worshipType}_${song.tempo}`]?.push(song);
  }

  return NextResponse.json(grouped);
}
