import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const songs = await prisma.song.findMany({
    include: { _count: { select: { setlistSongs: true } } },
    orderBy: { titleKo: "asc" },
  });

  // 템포(HIGH/MID_HIGH/MID/LOW) 4분류로 그룹핑해서 반환
  const grouped: Record<string, typeof songs> = {
    HIGH: [],
    MID_HIGH: [],
    MID: [],
    LOW: [],
  };
  for (const song of songs) {
    grouped[song.tempo]?.push(song);
  }

  return NextResponse.json(grouped);
}
