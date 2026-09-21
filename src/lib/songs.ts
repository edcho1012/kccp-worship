import { prisma } from "./prisma"; // 기존 프로젝트의 prisma client 싱글턴 경로에 맞춰 수정
import { categorizeSongs, type Tempo } from "./gemini";

// 곡 제목 매칭용 정규화 (공백/괄호/대소문자 차이로 같은 곡이 중복 생성되는 걸 방지)
function normalize(title: string) {
  return title.replace(/\s+/g, "").replace(/[()[\]]/g, "").toLowerCase();
}

/**
 * 콘티에서 추출된 곡 제목 목록을 받아서
 * - 이미 DB에 있는 곡은 그대로 매칭
 * - 없는 곡은 Gemini로 템포 자동 분류 후 새로 생성
 * 반환값은 입력 순서를 유지한 Song 레코드 배열
 *
 * 매주 콘티 업로드용. 대량 업로드는 upsertCategorizedSongsInOrder를 씀
 * (조각마다 분류 API를 또 부르면 무료 할당량을 너무 많이 씀).
 */
export async function upsertSongsInOrder(titles: string[]) {
  const existing = await prisma.song.findMany();
  const existingByNorm = new Map(existing.map((s) => [normalize(s.titleKo), s]));

  const newTitles = titles.filter((t) => !existingByNorm.has(normalize(t)));
  const categories = await categorizeSongs(newTitles);

  const result = [];
  for (const title of titles) {
    const norm = normalize(title);
    let song = existingByNorm.get(norm);

    if (!song) {
      const tempo: Tempo = categories[title]?.tempo ?? "MID"; // 분류 실패 시 기본값
      song = await prisma.song.create({
        data: { titleKo: title, tempo },
      });
      existingByNorm.set(norm, song);
    }
    result.push(song);
  }
  return result;
}

export type CategorizedSongInput = {
  title: string;
  tempo: Tempo;
};

/**
 * 곡 제목 + 템포가 이미 같이 붙어서 온 경우(대량 업로드에서 추출 단계와 분류를 한 번에 물어봄)
 * 별도 분류 API 호출 없이 그대로 upsert. Gemini 무료 할당량을 아끼기 위한 경로.
 */
export async function upsertCategorizedSongsInOrder(songs: CategorizedSongInput[]) {
  const existing = await prisma.song.findMany();
  const existingByNorm = new Map(existing.map((s) => [normalize(s.titleKo), s]));

  const result = [];
  for (const { title, tempo } of songs) {
    const norm = normalize(title);
    let song = existingByNorm.get(norm);

    if (!song) {
      song = await prisma.song.create({
        data: { titleKo: title, tempo },
      });
      existingByNorm.set(norm, song);
    }
    result.push(song);
  }
  return result;
}
