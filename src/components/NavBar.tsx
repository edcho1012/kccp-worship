"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UploadCloud, CalendarDays, Music, Settings } from "lucide-react";

const links = [
  { href: "/upload", label: "콘티 업로드", icon: UploadCloud },
  { href: "/setlists", label: "콘티 기록", icon: CalendarDays },
  { href: "/songs", label: "곡 라이브러리", icon: Music },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-semibold text-ink">
          찬양 콘티
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-accent-soft text-accent font-medium" : "text-ink-soft hover:bg-accent-soft/60"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
