import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractSetlist, classifyMoodFromYoutube } from "@/lib/gemini";
import { upsertSongsInOrder } from "@/lib/songs";
import { uploadToR2 } from "@/lib/r2";
import { fetchPlaylistVideos, matchSongToVideo } from "@/lib/youtube";

export const maxDuration = 300;

export async function GET() {
  const setlists = await prisma.setlist.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { songs: { include: { song: true }, orderBy: { order: "asc" } } },
  });
  return NextResponse.json(setlists);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const text = form.get("text") as string | null;
    const file = form.get("file") as File | null;
    const youtubePlaylist = (form.get("youtubePlaylist") as string | null)?.trim() || null;

    let extracted;
    let fileUrl: string | null = null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());

      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 15) {
        return NextResponse.json(
          {
            error: `파일이 너무 커요 (${sizeMB.toFixed(1)}MB). 15MB 이하로 압축해서 다시 올려줘. Mac이면 Preview 앱에서 파일 열고 File > Export... 에서 Quartz Filter를 "Reduce File Size"로 바꿔서 내보내면 훨씬 작아져.`,
          },
          { status: 400 }
        );
      }

      const base64 = buffer.toString("base64");
      const mediaType = file.type as "application/pdf" | "image/png" | "image/jpeg";

      extracted = await extractSetlist({ base64, mediaType });
      console.log(`[콘티 파싱] 파일: ${file.name}, PDF 크기: ${sizeMB.toFixed(1)}MB, 추출된 곡 수: ${extracted.songs.length}`);
      console.log("[콘티 파싱] 추출된 곡 목록:", extracted.songs);
      fileUrl = await uploadToR2(buffer, file.name, file.type);
    } else if (text) {
      extracted = await extractSetlist(text);
    } else {
      return NextResponse.json({ error: "text 또는 file 중 하나는 필요해요" }, { status: 400 });
    }

    const songs = await upsertSongsInOrder(extracted.songs.map((s) => ({ title: s.title, key: s.key })));

    // 유튜브 플레이리스트가 같이 왔으면, 곡마다 매칭되는 영상을 찾아서 분위기(mood)를 자동 설정
    // (이미 mood가 있는 곡은 건드리지 않음 - 수동으로 정해둔 걸 덮어쓰지 않으려고)
    if (youtubePlaylist) {
      try {
        const videos = await fetchPlaylistVideos(youtubePlaylist);
        for (const song of songs) {
          if (song.mood) continue;
          const match = matchSongToVideo(song.titleKo, videos);
          if (!match) continue;
          try {
            const mood = await classifyMoodFromYoutube(match.url, song.titleKo);
            await prisma.song.update({ where: { id: song.id }, data: { mood } });
            console.log(`[유튜브 분위기] ${song.titleKo} -> ${mood}`);
          } catch (err: any) {
            console.error(`[유튜브 분위기] ${song.titleKo} 분류 실패:`, err.message);
          }
        }
      } catch (err: any) {
        console.error("[유튜브 플레이리스트] 처리 실패:", err.message);
        // 플레이리스트 처리가 실패해도 콘티 업로드 자체는 계속 진행
      }
    }

    const setlist = await prisma.setlist.create({
      data: {
        date: extracted.date ? new Date(extracted.date) : null, // 콘티에 날짜 없으면 null (빈칸)
        title: extracted.title,
        rawText: typeof text === "string" ? text : null,
        fileUrl,
        songs: {
          create: songs
            .map((song, i) => ({
              songId: song.id,
              pageNumber: extracted.songs[i]?.page ?? null,
              musicalKey: extracted.songs[i]?.key ?? null,
            }))
            // 한 주 안에서 같은 곡이 두 번 이상 나오리 (같은 찬양을 두 번 부마리) DB 유일성 제약 때문에 첫 번만 남기고 걸리마리
            .filter((item, i, arr) => arr.findIndex((x) => x.songId === item.songId) === i)
            .map((item, i) => ({ ...item, order: i })),
        },
      },
      include: { songs: { include: { song: true } } },
    });

    return NextResponse.json(setlist, { status: 201 });
  } catch (err: any) {
    // 원인이 뭐든(Gemini 실패, R2 실패, DB 실패) 프론트가 실제 에러 메시지를 볼 수 있게 항상 JSON으로 응답
    console.error("콘티 업로드 실패:", err);
    return NextResponse.json(
      { error: err?.message ?? "콘티 처리 중 알 수 없는 에러가 발생했어요" },
      { status: 500 }
    );
  }
}
