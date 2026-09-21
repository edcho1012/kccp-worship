import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UploadCloud, FileText } from "lucide-react";
import FixedSongsBanner from "@/components/FixedSongsBanner";

const tempoLabel: Record<string, string> = {
  HIGH: "High",
  MID_HIGH: "Mid-high",
  MID: "Mid",
  LOW: "Low",
};

function SongList({ songs }: { songs: any[] }) {
  return (
    <ol className="space-y-2">
      {songs.map((ss) => (
        <li key={ss.id} className="flex items-center gap-2 text-sm">
          <span className="text-ink-soft w-5 shrink-0">{ss.order + 1}.</span>
          <Link href={`/songs/${ss.song.id}`} className="flex-1 hover:text-accent">
            {ss.song.titleKo}
          </Link>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">
            {tempoLabel[ss.song.tempo] ?? ss.song.tempo}
          </span>
          {ss.song.mood && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold-soft text-gold">{ss.song.mood}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default async function SetlistsPage() {
  const setlists = await prisma.setlist.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { songs: { include: { song: true }, orderBy: { order: "asc" } } },
  });

  const dated = setlists.filter((s) => s.date);
  const undated = setlists.filter((s) => !s.date);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">콘티 기록</h1>
        <Link
          href="/upload"
          className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <UploadCloud size={16} strokeWidth={2} />
          콘티 업로드
        </Link>
      </div>

      <FixedSongsBanner />

      <div className="space-y-4">
        {dated.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-paper-raised p-5">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-medium">{s.date!.toISOString().slice(0, 10)}</span>
              <div className="flex items-center gap-3">
                {s.fileUrl && (
                  <a
                    href={s.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <FileText size={14} strokeWidth={2} />
                    원본 보기
                  </a>
                )}
                {s.title && <span className="text-sm text-ink-soft">{s.title}</span>}
              </div>
            </div>
            <SongList songs={s.songs} />
          </div>
        ))}

        {undated.length > 0 && (
          <div className="rounded-xl border border-line bg-paper-raised p-5">
            <span className="font-medium block mb-4">날짜 미정 ({undated.length}개)</span>
            <div className="space-y-5">
              {undated.map((s) => (
                <div key={s.id}>
                  {(s.title || s.fileUrl) && (
                    <div className="flex items-center justify-between mb-2">
                      {s.title && <span className="text-sm text-ink-soft">{s.title}</span>}
                      {s.fileUrl && (
                        <a
                          href={s.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <FileText size={14} strokeWidth={2} />
                          원본 보기
                        </a>
                      )}
                    </div>
                  )}
                  <SongList songs={s.songs} />
                </div>
              ))}
            </div>
          </div>
        )}

        {setlists.length === 0 && (
          <p className="text-sm text-ink-soft py-8 text-center">아직 업로드된 콘티가 없어요.</p>
        )}
      </div>
    </div>
  );
}
