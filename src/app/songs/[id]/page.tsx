import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SongEditor from "@/components/SongEditor";

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!song) return <div className="max-w-xl mx-auto px-6 py-12">곡을 찾을 수 없어요.</div>;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <Link href="/songs" className="inline-flex items-center gap-1.5 text-sm text-ink-soft mb-6">
        <ArrowLeft size={16} strokeWidth={2} />
        곡 라이브러리
      </Link>

      <SongEditor song={song} />

      <h2 className="text-sm font-medium text-ink-soft mb-3">
        사용 이력 ({song.setlistSongs.length}회)
      </h2>
      <ul className="space-y-2">
        {song.setlistSongs.map((ss) => (
          <li
            key={ss.id}
            className="flex items-center justify-between border border-line bg-paper-raised rounded-lg px-4 py-3 text-sm"
          >
            <span>
              {ss.setlist.date ? ss.setlist.date.toISOString().slice(0, 10) : "날짜 미정"}
              {ss.setlist.title && <span className="text-ink-soft ml-2">{ss.setlist.title}</span>}
            </span>
            {ss.setlist.fileUrl && (
              <a
                href={ss.pageNumber ? `${ss.setlist.fileUrl}#page=${ss.pageNumber}` : ss.setlist.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline shrink-0"
              >
                <FileText size={14} strokeWidth={2} />
                악보 보기
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
