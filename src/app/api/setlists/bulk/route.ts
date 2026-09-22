import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractMultipleSetlists } from "@/lib/gemini";
import { upsertCategorizedSongsInOrder } from "@/lib/songs";
import { splitPdfIntoChunks } from "@/lib/pdfSplit";
import { uploadToR2 } from "@/lib/r2";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(message: string) {
  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

/**
 * 여러 주의 콘티가 한 파일에 몰려있는 걸 한 번에 올릴 때 쓰는 엔드포인트.
 * PDF를 페이지 단위로 쪼개서 조각마다 Gemini에게 보내고, 조각 하나에서 여러 주가
 * 나오면 그만큼 Setlist를 여러 개 만든다. 조각 하나가 실패해도 나머지는 계속 진행.
 * (곡 추출 + 분류 + 페이지 번호를 한 번에 같이 물어봐서 조각당 API 호출을 1번으로 줄임)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file이 필요해요" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf";
    // 조각을 좀 크게(=조각 수를 적게) 잡아서 API 호출 수를 줄임
    const chunks = isPdf
      ? await splitPdfIntoChunks(buffer, 12 * 1024 * 1024)
      : [{ buffer, startPage: 1 }];

    // 원본(큰 아카이브) 파일을 R2에 한 번만 올리고, 그 링크를 여기서 나온 모든 주간 콘티에 붙여줌
    let fileUrl: string | null = null;
    try {
      fileUrl = await uploadToR2(buffer, file.name, file.type || "application/pdf");
    } catch (err: any) {
      console.error("[대량 업로드] 원본 R2 업로드 실패:", err.message);
      // 원본 업로드가 실패해도 곡 추출 자체는 계속 진행 (악보 링크만 못 붙임)
    }

    console.log(
      `[대량 업로드] 파일: ${file.name}, 전체 크기: ${(buffer.length / 1024 / 1024).toFixed(1)}MB, 조각 수: ${chunks.length}`
    );

    const created: { date: string | null; title: string | null; songCount: number }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let lastErr: any = null;
      let succeeded = false;

      // 혼잡(503)/할당량(429) 에러면 잠깐 쉬고 최대 3번까지 재시도
      for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
        try {
          const base64 = chunk.buffer.toString("base64");
          const mediaType = isPdf ? "application/pdf" : (file.type as "image/png" | "image/jpeg");
          const entries = await extractMultipleSetlists({ base64, mediaType });

          console.log(`[대량 업로드] ${i + 1}/${chunks.length}번째 조각에서 ${entries.length}개 주 발견`);

          for (const entry of entries) {
            if (!entry.songs || entry.songs.length === 0) continue;

            const songs = await upsertCategorizedSongsInOrder(entry.songs);
            await prisma.setlist.create({
              data: {
                date: entry.date ? new Date(entry.date) : null,
                title: entry.title,
                fileUrl,
                songs: {
                  create: songs
                    .map((s, idx) => {
                      const rawPage = entry.songs[idx]?.page;
                      // 조각 안에서의 페이지 번호를 원본 파일 기준 페이지 번호로 환산
                      const pageNumber = rawPage != null ? chunk.startPage + (rawPage - 1) : null;
                      const musicalKey = entry.songs[idx]?.key ?? null;
                      return { songId: s.id, pageNumber, musicalKey };
                    })
                    // 한 주 안에서 같은 곡이 두 번 이상 나오면(같은 찬양을 두 번 부른 경우) DB 유일성 제약 때문에 첫 번만 남기고 걸러냄
                    .filter((item, idx, arr) => arr.findIndex((x) => x.songId === item.songId) === idx)
                    .map((item, idx) => ({ ...item, order: idx })),
                },
              },
            });

            created.push({ date: entry.date, title: entry.title, songCount: entry.songs.length });
          }
          succeeded = true;
        } catch (err: any) {
          lastErr = err;
          if (attempt < 2 && isTransient(err.message ?? "")) {
            const wait = 15000 * (attempt + 1); // 15초, 30초로 점점 늘려서 재시도
            console.log(`[대량 업로드] ${i + 1}번째 조각 혼잡/할당량, ${wait / 1000}초 뒤 재시도...`);
            await sleep(wait);
          } else {
            break;
          }
        }
      }

      if (!succeeded && lastErr) {
        console.error(`[대량 업로드] ${i + 1}번째 조각 최종 실패:`, lastErr);
        errors.push(`${i + 1}번째 조각: ${lastErr.message ?? "알 수 없는 에러"}`);
      }

      // 조각 사이에 살짝 쉬어서 분당 요청 수 제한에도 안 걸리게
      if (i < chunks.length - 1) await sleep(2000);
    }

    return NextResponse.json({ createdCount: created.length, created, errors }, { status: 201 });
  } catch (err: any) {
    console.error("대량 콘티 업로드 실패:", err);
    return NextResponse.json({ error: err?.message ?? "알 수 없는 에러가 발생했어요" }, { status: 500 });
  }
}
