import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const song = await prisma.song.findUnique({
    where: { id },
    include: {
      setlistSongs: {
        include: { setlist: true },
        orderBy: { setlist: { date: "desc" } },
      },
    },
  });

  if (!song) return NextResponse.json({ error: "곡을 찾을 수 없어요" }, { status: 404 });

  return NextResponse.json({
    ...song,
    history: song.setlistSongs.map((ss) => ss.setlist), // 날짜 없는 콘티는 date: null로 내려감
  });
}

const VALID_TEMPOS = ["HIGH", "MID_HIGH", "MID", "LOW"];
const VALID_ROLE_TAGS = ["입례곡", "공동체 고백송", "축복송"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { titleKo, tempo, mood, roleTag, musicalKey } = body as {
    titleKo?: string;
    tempo?: string;
    mood?: string | null;
    roleTag?: string | null;
    musicalKey?: string | null;
  };

  if (tempo !== undefined && !VALID_TEMPOS.includes(tempo)) {
    return NextResponse.json({ error: "tempo는 HIGH/MID_HIGH/MID/LOW 중 하나여야 해요" }, { status: 400 });
  }
  if (roleTag !== undefined && roleTag !== null && roleTag !== "" && !VALID_ROLE_TAGS.includes(roleTag)) {
    return NextResponse.json(
      { error: "roleTag는 입례곡/공동체 고백송/축복송 중 하나거나 비워둬야 해요" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (titleKo !== undefined) data.titleKo = titleKo;
  if (tempo !== undefined) data.tempo = tempo;
  if (mood !== undefined) data.mood = mood || null;
  if (roleTag !== undefined) data.roleTag = roleTag || null;
  if (musicalKey !== undefined) data.musicalKey = musicalKey || null;

  try {
    const song = await prisma.song.update({ where: { id }, data });
    return NextResponse.json(song);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "수정에 실패했어요" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.song.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "삭제에 실패했어요" }, { status: 500 });
  }
}
