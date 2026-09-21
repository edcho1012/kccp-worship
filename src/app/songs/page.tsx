import { prisma } from "@/lib/prisma";
import SongsGrid from "@/components/SongsGrid";

export default async function SongsPage() {
  const songs = await prisma.song.findMany({
    include: { _count: { select: { setlistSongs: true } } },
    orderBy: { titleKo: "asc" },
  });

  const forGrid = songs.map((s) => ({
    id: s.id,
    titleKo: s.titleKo,
    tempo: s.tempo,
    mood: s.mood,
    roleTag: s.roleTag,
    count: s._count.setlistSongs,
  }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <h1 className="font-serif text-2xl font-semibold">곡 라이브러리</h1>
      <SongsGrid songs={forGrid} />
    </div>
  );
}
