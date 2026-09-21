import Link from "next/link";
import { Pin } from "lucide-react";
import { getCurrentMinistryYear } from "@/lib/ministryYear";

export default async function FixedSongsBanner() {
  const year = await getCurrentMinistryYear();
  const hasSongs = year.entranceSong && year.confessionSong;

  return (
    <div className="rounded-xl border border-gold/30 bg-gold-soft px-5 py-4 flex items-start gap-3">
      <Pin size={20} className="text-gold mt-0.5 shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gold font-medium mb-1">{year.label} 사역년도 고정곡</p>
        {hasSongs ? (
          <p className="text-sm text-ink">
            입례곡 <span className="font-medium">{year.entranceSong!.titleKo}</span>
            <span className="text-ink-soft mx-2">·</span>
            공동체 고백송 <span className="font-medium">{year.confessionSong!.titleKo}</span>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">아직 설정 안 됨</p>
        )}
      </div>
      <Link href="/settings" className="text-xs text-gold underline underline-offset-2 shrink-0 mt-0.5">
        수정
      </Link>
    </div>
  );
}
