import { prisma } from "./prisma";
import { upsertSongsInOrder } from "./songs";

/**
 * 우리 교회 사역년도는 8월 시작, 7월 끝. 예: 2026년 9월 -> "2026-2027"
 */
export function ministryYearLabelForDate(date: Date): string {
  const startYear = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1; // getMonth()의 7 = 8월
  return `${startYear}-${startYear + 1}`;
}

export function currentMinistryYearLabel(): string {
  return ministryYearLabelForDate(new Date());
}

function startYearFromLabel(label: string): number {
  return parseInt(label.split("-")[0], 10);
}

/**
 * 특정 사역년도(label)의 고정곡 레코드를 가져오거나, 없으면 빈 채로 만들어서 반환
 */
export async function getOrCreateMinistryYear(label: string) {
  const existing = await prisma.ministryYear.findUnique({
    where: { label },
    include: { entranceSong: true, confessionSong: true },
  });
  if (existing) return existing;

  return prisma.ministryYear.create({
    data: { label, startYear: startYearFromLabel(label) },
    include: { entranceSong: true, confessionSong: true },
  });
}

export async function getCurrentMinistryYear() {
  return getOrCreateMinistryYear(currentMinistryYearLabel());
}

/**
 * 사역년도의 입례곡/공동체 고백송을 설정(or 변경). 곡이 처음 등장하면 자동 분류까지 같이 됨.
 */
export async function setMinistryYearFixedSongs(
  label: string,
  entranceTitle: string,
  confessionTitle: string
) {
  const [entranceSong, confessionSong] = await upsertSongsInOrder([entranceTitle, confessionTitle]);

  return prisma.ministryYear.upsert({
    where: { label },
    create: {
      label,
      startYear: startYearFromLabel(label),
      entranceSongId: entranceSong.id,
      confessionSongId: confessionSong.id,
    },
    update: {
      entranceSongId: entranceSong.id,
      confessionSongId: confessionSong.id,
    },
    include: { entranceSong: true, confessionSong: true },
  });
}
