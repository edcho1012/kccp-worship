# 찬양 콘티 기록 사이트

찬양팀이 매주 올리는 콘티(PDF/이미지/텍스트)를 업로드하면 Gemini API가 곡 목록과 날짜를 자동으로 뽑아내고,
새로 나온 곡은 경배/찬양, 빠른곡/느린곡으로 자동 분류해서 저장해. 콘티 목록과 곡 라이브러리를 각각 볼 수 있고,
매년 8월~7월 사역년도 단위로 고정으로 쓰는 입례곡/공동체 고백송도 설정할 수 있어.

## 구조

```
prisma/schema.prisma              Song / Setlist / SetlistSong / MinistryYear 모델
prisma.config.ts                  Prisma CLI 설정 (마이그레이션용 DIRECT_URL)
lib/prisma.ts                     Prisma Client 싱글턴 (Neon 드라이버 어댑터 사용)
lib/gemini.ts                     콘티에서 곡·날짜 추출, 신곡 자동 분류 (Gemini API, 무료 티어)
lib/songs.ts                      곡 매칭/생성 로직 (중복 방지)
lib/ministryYear.ts               8월~7월 사역년도 계산, 고정곡(입례곡/공동체 고백송) 조회·저장
app/api/setlists/route.ts         콘티 업로드(POST) / 목록(GET)
app/api/songs/route.ts            곡 목록 (4분류 그룹핑)
app/api/songs/[id]/route.ts       곡 하나의 사용 이력
app/api/ministry-years/route.ts   현재 사역년도 조회(GET) / 고정곡 저장(POST)
app/page.tsx                      홈 (고정곡 배너 + 3개 바로가기)
app/upload/page.tsx               업로드 화면 (파일 or 텍스트)
app/setlists/page.tsx             콘티 목록 화면
app/songs/page.tsx                곡 라이브러리 화면
app/songs/[id]/page.tsx           곡 상세 + 이력 화면
app/settings/page.tsx             사역년도 고정곡(입례곡/공동체 고백송) 설정 화면
components/NavBar.tsx             상단 공용 내비게이션
components/FixedSongsBanner.tsx   현재 사역년도 고정곡 배너 (홈/콘티 목록에서 재사용)
```

## 디자인 톤

기본 다크모드(브라우저가 다크모드면 배경이 까맣게 바뀌는 것)를 없애고 항상 밝은 톤으로 고정했어.

- 배경: 따뜻한 종이색(`--paper` #faf7f2), 카드는 흰색(`--paper-raised`)
- 본문 색: 완전한 검정 대신 살짝 톤 다운된 잉크색(`--ink` #2b2a28)
- 강조색: 차분한 남청색(`--accent` #4c5b7a) — 버튼, 활성 탭, "경배" 태그에 사용
- 포인트색: 금색(`--gold` #b98b3e) — 사역년도 고정곡 배너, "찬양" 태그에만 써서 눈에 띄게 함
- 제목은 세리프(Noto Serif KR), 본문/버튼은 산세리프(Noto Sans KR)
- 아이콘은 lucide-react, 18~32px 사이로 여유 있게 사용

## 기존 프로젝트에 붙일 때 체크할 것

1. **환경 변수**
   ```
   DATABASE_URL=...          # Neon pooled 연결 (Prisma Client가 어댑터로 사용)
   DIRECT_URL=...            # Neon direct 연결 (Prisma CLI가 마이그레이션에 사용)
   GEMINI_API_KEY=...        # aistudio.google.com에서 발급 (무료 티어 있음)
   ```
2. **의존성**: `npm install @google/genai @prisma/adapter-neon lucide-react`
3. **Prisma 7 주의사항**: Prisma 7부터 CLI가 완전히 바뀌어서, `schema.prisma`의 datasource 블록에는
   `url`/`directUrl`을 더 이상 안 써. 대신 루트에 있는 `prisma.config.ts`(CLI가 씀, `DIRECT_URL` 사용)와
   `lib/prisma.ts`의 `@prisma/adapter-neon`(런타임이 씀, `DATABASE_URL` 사용)으로 나눠놨어. `npm install prisma@7`처럼
   버전을 반드시 `7`로 고정해서 설치해야 해 (그냥 `npm install prisma`는 아직 RC 단계인 Prisma 8을 깔아버림).
4. **마이그레이션**: 스키마에 `MinistryYear` 모델을 추가했으니 `npx prisma migrate dev --name add_ministry_year` 실행 필요
5. **R2 원본 파일 보관**: `app/api/setlists/route.ts` 안에 `uploadToR2` 주석 처리해둔 부분 있어.
   PiTTime 때 쓰던 R2 업로드 헬퍼를 `lib/r2.ts`로 옮겨와서 주석 풀면 콘티 원본 PDF/이미지도 같이 보관돼.

## 사역년도 고정곡 (입례곡 / 공동체 고백송)

- 8월 시작 ~ 7월 끝을 한 사역년도로 봐서 `MinistryYear` 테이블에 `"2026-2027"` 같은 라벨로 저장해.
- `/settings`에서 입례곡, 공동체 고백송 제목을 입력하면 그 사역년도에 고정으로 저장돼.
- 홈 화면과 콘티 목록 화면 상단에 현재 사역년도 고정곡이 배너로 항상 보여.
- 매주 콘티 자체에는 입례곡/고백송을 굳이 안 적어도 돼 — 이건 별도로 관리되는 고정값이라, 콘티 업로드 파싱 로직과는 상관없어.
- 8월이 되면 자동으로 새 사역년도로 넘어가고(고정곡은 비어있는 상태로 시작), `/settings`에서 그 해의 곡으로 다시 설정하면 돼.

## 참고할 점

- 곡 매칭은 제목 문자열 정규화(공백/괄호 제거)로만 하고 있어. 같은 곡이 표기가 크게 다르게 적히는 경우가 많으면
  (예: "주 은혜임을" vs "주은혜임을(Live)") 나중에 유사도 매칭이나 수동 병합 UI를 추가하는 걸 고려해봐.
- 콘티에 날짜가 없으면 `date`는 `null`로 들어가고, 목록/이력 화면에서 "날짜 미정"으로 표시돼.
- 곡 자동 분류(경배/찬양, 빠른곡/느린곡)는 Gemini의 추정이라 가끔 틀릴 수 있어. 나중에 곡 상세 페이지에
  수동으로 카테고리 고치는 버튼을 추가하면 좋을 것 같아.
- Gemini 무료 티어는 분당/일일 요청 수 제한이 있어. 매주 콘티 하나 올리는 용도로는 충분하지만,
  한꺼번에 여러 콘티를 몰아서 올리면 rate limit에 걸릴 수 있으니 참고해.
