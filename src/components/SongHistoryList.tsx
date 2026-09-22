"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";

export type HistoryItem = {
  id: string; // SetlistSong id
  setlistId: string;
  date: string | null; // ISO string
  title: string | null;
  fileUrl: string | null;
  pageNumber: number | null;
  musicalKey: string | null;
};

export default function SongHistoryList({ items }: { items: HistoryItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 날짜 + 제목이 완전히 똑같은 항목이 여러 개면 중복으로 표시
  const dupKeys = new Set<string>();
  const seen = new Map<string, number>();
  for (const item of items) {
    const key = `${item.date ?? "null"}|${item.title ?? "null"}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) dupKeys.add(key);
  }

  async function handleDelete(setlistId: string, label: string) {
    if (!confirm(`"${label}" 콘티를 삭제할까? 이 콘티에 있는 다른 곡들에도 영향이 가.`)) return;
    setDeletingId(setlistId);
    setError(null);
    try {
      const res = await fetch(`/api/setlists/${setlistId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "삭제에 실패했어요");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <ul className="space-y-2">
        {items.map((item) => {
          const key = `${item.date ?? "null"}|${item.title ?? "null"}`;
          const isDup = dupKeys.has(key);
          const label = item.date ? item.date.slice(0, 10) : "날짜 미정";

          return (
            <li
              key={item.id}
              className={`flex items-center justify-between border rounded-lg px-4 py-3 text-sm ${
                isDup ? "border-red-300 bg-red-50" : "border-line bg-paper-raised"
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                {item.title && <span className="text-ink-soft">{item.title}</span>}
                {item.musicalKey && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ink text-white">{item.musicalKey}</span>
                )}
                {isDup && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">중복 의심</span>
                )}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {item.fileUrl && (
                  <a
                    href={item.pageNumber ? `${item.fileUrl}#page=${item.pageNumber}` : item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <FileText size={14} strokeWidth={2} />
                    악보 보기
                  </a>
                )}
                <button
                  onClick={() => handleDelete(item.setlistId, `${label} ${item.title ?? ""}`.trim())}
                  disabled={deletingId === item.setlistId}
                  className="flex items-center gap-1 text-xs text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={14} strokeWidth={2} />
                  {deletingId === item.setlistId ? "삭제 중..." : "삭제"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
