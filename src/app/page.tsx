import Link from "next/link";
import { UploadCloud, CalendarDays, Music } from "lucide-react";
import FixedSongsBanner from "@/components/FixedSongsBanner";

export const dynamic = "force-dynamic";

const tiles = [
  {
    href: "/upload",
    icon: UploadCloud,
    title: "콘티 업로드",
    desc: "이번 주 콘티를 파일이나 텍스트로 올려요",
  },
  {
    href: "/setlists",
    icon: CalendarDays,
    title: "콘티 기록",
    desc: "지난 콘티들을 날짜별로 모아봐요",
  },
  {
    href: "/songs",
    icon: Music,
    title: "곡 라이브러리",
    desc: "곡별로 언제 불렀는지 확인해요",
  },
];

export default async function Home() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold mb-2">찬양 콘티 기록</h1>
        <p className="text-ink-soft">매주 콘티를 올리고, 곡을 모아보는 곳</p>
      </div>

      <FixedSongsBanner />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-line bg-paper-raised p-5 hover:border-accent/40 hover:bg-accent-soft/40 transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center mb-4">
              <Icon size={22} className="text-accent" strokeWidth={2} />
            </div>
            <p className="font-medium mb-1">{title}</p>
            <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
