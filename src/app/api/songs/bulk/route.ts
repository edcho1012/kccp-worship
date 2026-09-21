import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TEMPOS = ["HIGH", "MID_HIGH", "MID", "LOW"];

/**
 * 여러 곡을 한 번에 선택해서 템포를 일괄 변경할 때 씀.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, tempo } = body as { ids?: string[]; tempo?: string };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids가 필요해요" }, { status: 400 });
  }
  if (!tempo || !VALID_TEMPOS.includes(tempo)) {
    return NextResponse.json({ error: "tempo는 HIGH/MID_HIGH/MID/LOW 중 하나여야 해요" }, { status: 400 });
  }

  const result = await prisma.song.updateMany({
    where: { id: { in: ids } },
    data: { tempo },
  });

  return NextResponse.json({ updatedCount: result.count });
}
