import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SongEditor from "@/components/SongEditor";
import SongHistoryList from "@/components/SongHistoryList";

export const dynamic = "force-dynamic";

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

  const distinctKeys = Array.from(
    new Set(song.setlistSongs.map((ss) => ss.musicalKey).filter((k): k is string => !!k))
  );

  const historyItems = song.setlistSongs.map((ss) => ({
    id: ss.id,
    setlistId: ss.setlist.id,
    date: ss.setlist.date ? ss.setlist.date.toISOString() : null,
    title: ss.setlist.title,
    fileUrl: ss.setlist.fileUrl,
    pageNumber: ss.pageNumber,
    musicalKey: ss.musicalKey,
  }));

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <Link href="/songs" className="inline-flex items-center gap-1.5 text-sm text-ink-soft mb-6">
        <ArrowLeft size={16} strokeWidth={2} />
        곡 라이브러리
      </Link>

      <SongEditor song={song} />

      {distinctKeys.length > 1 && (
        <p className="text-xs text-gold mb-4">
          이 곡은 주마다 다른 키로 쓰였어: {distinctKeys.join(", ")}
        </p>
      )}

      <h2 className="text-sm font-medium text-ink-soft mb-3">
        사용 이력 ({song.setlistSongs.length}회)
      </h2>
      <SongHistoryList items={historyItems} />
    </div>
  );
}
