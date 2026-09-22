import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-3.6-flash 무료 티어는 하루 20회 한도라 대량 업로드에 못 씀.
// gemini-3.5-flash-lite는 무료 한도가 훨씬 넉넉해서 이걸로 고정.
const MODEL = "gemini-3.5-flash-lite";

/**
 * JSON 코드블록이나 잡텍스트가 섞여 와도 안전하게 파싱
 */
function parseJson<T>(text: string | undefined): T {
  if (!text || !text.trim()) {
    throw new Error("Gemini가 빈 응답을 줬어요 (파일이 너무 크거나, 콘텐츠 필터에 걸렸을 수 있어요)");
  }
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini 응답을 JSON으로 못 읽었어요: ${cleaned.slice(0, 200)}`);
  }
}

export type ExtractedSongRef = {
  title: string;
  page: number | null; // 원본 파일에서 이 곡이 시작하는 페이지(1-indexed). 텍스트 입력이면 항상 null
  key: string | null; // 콘티에 적힌 곡 키/코드 표기 (예: "G", "D", "Capo3 Am"), 없으면 null
};

export type ExtractedSetlist = {
  date: string | null; // "YYYY-MM-DD" 또는 null
  title: string | null;
  songs: ExtractedSongRef[]; // 콘티에 등장한 순서대로
};

/**
 * 콘티 원본(텍스트 또는 이미지/PDF)에서 날짜, 제목, 곡 목록(+페이지 번호, +키)을 추출한다. (한 주 분량 기준)
 * - input이 string이면 텍스트 직접 입력 케이스
 * - input이 { base64, mediaType }이면 파일 업로드 케이스 (이미지/PDF)
 */
export async function extractSetlist(
  input: string | { base64: string; mediaType: "application/pdf" | "image/png" | "image/jpeg" }
): Promise<ExtractedSetlist> {
  const instruction = `너는 교회 찬양팀 콘티를 분석하는 도우미야. 아래 콘티에서 다음을 JSON으로만 추출해줘.
다른 설명이나 마크다운 없이 순수 JSON만 응답해:
{
  "date": "콘티에 날짜가 명시되어 있으면 YYYY-MM-DD, 없으면 null",
  "title": "콘티 제목이나 모임 이름이 적혀 있으면 그 문자열, 없으면 null",
  "songs": [
    {
      "title": "곡 제목",
      "page": "이 곡이 시작하는 페이지 번호(1부터 시작하는 정수), 텍스트라 페이지 개념이 없으면 null",
      "key": "콘티에 적힌 이 곡의 키/코드 표기(예: G, D, Capo3 Am, E♭), 안 적혀 있으면 null"
    }
  ]
}
중요: 콘티 안에 곡이 몇 개든 절대 빠짐없이 전부 추출해. 입례곡, 공동체 고백송, 경배, 찬양, 특별순서, 통성기도곡 등 어느 섹션에 있든 콘티에 등장하는 모든 곡을 순서대로 다 포함해야 해 (한두 곡만 뽑고 끝내면 안 돼).
곡 제목은 콘티에 적힌 표기를 최대한 그대로 사용해. 비트 같은 부가 정보는 무시하고 제목/페이지/키만 담아.`;

  const parts =
    typeof input === "string"
      ? [{ text: `${instruction}\n\n---콘티 원문---\n${input}` }]
      : [
          { inlineData: { mimeType: input.mediaType, data: input.base64 } },
          { text: instruction },
        ];

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { maxOutputTokens: 4096 },
  });

  return parseJson<ExtractedSetlist>(res.text);
}

export type Tempo = "HIGH" | "MID_HIGH" | "MID" | "LOW";

export type CategorizedSongRef = {
  title: string;
  tempo: Tempo;
  page: number | null; // 이 조각(청크) 안에서 시작하는 페이지(1-indexed)
  key: string | null; // 콘티에 적힌 곡 키/코드 표기, 없으면 null
};

export type ExtractedMultiSetlistEntry = {
  date: string | null;
  title: string | null;
  songs: CategorizedSongRef[];
};

/**
 * 여러 주(week)의 콘티가 한 파일(조각)에 이어 붙어 있을 수 있는 경우, 주 단위로 나눠서
 * 추출한다. 대량 업로드(과거 콘티 모음)에서 씀. 템포 분류 + 페이지 번호 + 키까지 한 번에
 * 같이 물어봐서 API 호출 수를 아낀다 (무료 할당량이 넉넉하지 않아서).
 */
export async function extractMultipleSetlists(input: {
  base64: string;
  mediaType: "application/pdf" | "image/png" | "image/jpeg";
}): Promise<ExtractedMultiSetlistEntry[]> {
  const instruction = `이 파일에는 여러 주(week)의 찬양팀 콘티가 이어 붙어 있을 수 있어. 한 주씩 구분해서 각 주를 배열의 항목으로 만들어줘.
각 항목은 다음 형태:
{
  "date": "그 주 콘티에 날짜가 있으면 YYYY-MM-DD, 없으면 null",
  "title": "그 주 콘티 제목이나 모임 이름, 없으면 null",
  "songs": [
    {
      "title": "곡 제목",
      "tempo": "HIGH(빠르고 신나는 곡) / MID_HIGH(약간 빠른 곡) / MID(보통 속도) / LOW(느리고 잔잔한 곡) 중 하나",
      "page": "이 파일(지금 보고 있는 조각) 안에서 이 곡이 시작하는 페이지 번호(1부터 시작하는 정수)",
      "key": "콘티에 적힌 이 곡의 키/코드 표기(예: G, D, Capo3 Am, E♭), 안 적혀 있으면 null"
    }
  ]
}
전체 응답은 이 항목들의 JSON 배열이어야 해. 다른 설명이나 마크다운 없이 배열만 응답해.
콘티 구분 기준: 날짜가 바뀌거나, 입례곡부터 다시 시작하거나, 페이지가 넘어가면서 새로운 한 주가 시작되는 패턴을 참고해.
한 주 안에서는 곡을 빠짐없이 다 포함해 (songs 배열 순서 = 콘티에 등장한 순서). 이 파일 조각이 한 주 분량뿐이면 배열에 항목 하나만 담아.
page는 지금 보고 있는 이 파일(조각) 안에서의 페이지 번호야 (1페이지부터 시작).
잘 모르는 곡이면 가사 분위기나 제목 뉘앙스로 tempo를 최선을 다해 추정해.`;

  const parts = [
    { inlineData: { mimeType: input.mediaType, data: input.base64 } },
    { text: instruction },
  ];

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { maxOutputTokens: 8192 },
  });

  return parseJson<ExtractedMultiSetlistEntry[]>(res.text);
}

export type TempoCategory = { tempo: Tempo };

/**
 * 새로 등장한 곡 제목을 템포(HIGH/MID_HIGH/MID/LOW)로 자동 분류. (매주 업로드용)
 * 여러 곡을 한 번에 넘기면 API 호출을 아낄 수 있음.
 */
export async function categorizeSongs(titles: string[]): Promise<Record<string, TempoCategory>> {
  if (titles.length === 0) return {};

  const prompt = `아래는 한국 CCM/찬양 곡 제목 목록이야. 각 곡의 전형적인 템포를 다음 네 단계 중 하나로 분류해줘:
- HIGH: 빠르고 신나는 곡
- MID_HIGH: 약간 빠른 곡
- MID: 보통 속도
- LOW: 느리고 잔잔한 곡

곡 목록:
${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

순수 JSON 객체로만 응답해. key는 곡 제목 원문, value는 {"tempo": "HIGH"|"MID_HIGH"|"MID"|"LOW"}.
잘 모르는 곡이면 가사 분위기나 제목 뉘앙스로 최선을 다해 추정해.`;

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { maxOutputTokens: 4096 },
  });

  return parseJson<Record<string, TempoCategory>>(res.text);
}

/**
 * 유튜브 영상(플레이리스트의 한 곡)을 Gemini가 직접 듣고, 곡의 분위기를 한글 짧은 표현으로 반환.
 * (예: "엠비언트", "경쾌한", "웅장한", "잔잔한") JSON 아니고 짧은 텍스트 그대로 받음.
 */
export async function classifyMoodFromYoutube(videoUrl: string, songTitle: string): Promise<string> {
  const prompt = `이 유튜브 영상은 "${songTitle}"이라는 찬양/CCM 곡이야. 영상을 듣고 곡의 분위기를
한글 짧은 표현 하나로 답해줘 (예: 엠비언트, 경쾌한, 웅장한, 잔잔한, 신나는, 서정적인, 몽환적인 등).
다른 설명 없이 분위기 표현만 답해. 한두 단어로 짧게.`;

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ fileData: { fileUri: videoUrl } }, { text: prompt }],
      },
    ],
    config: { maxOutputTokens: 50 },
  });

  const text = res.text?.trim();
  if (!text) throw new Error("Gemini가 분위기를 판단하지 못했어요");
  return text.replace(/["'.]/g, "").trim();
}
