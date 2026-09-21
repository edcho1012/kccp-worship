"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Trash2 } from "lucide-react";

const TEMPO_LABEL: Record<string, string> = {
  HIGH: "High",
  MID_HIGH: "Mid-high",
  MID: "Mid",
  LOW: "Low",
};

const ROLE_TAGS = ["입례곡", "공동체 고백송", "축복송"];

type Props = {
  song: {
    id: string;
    titleKo: string;
    tempo: string;
    mood: string | null;
    roleTag: string | null;
  };
};

export default function SongEditor({ song }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [titleKo, setTitleKo] = useState(song.titleKo);
  const [tempo, setTempo] = useState(song.tempo);
  const [mood, setMood] = useState(song.mood ?? "");
  const [roleTag, setRoleTag] = useState(song.roleTag ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleKo, tempo, mood: mood || null, roleTag: roleTag || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "수정에 실패했어요");
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${song.titleKo}" 곡을 삭제할까? 이 곡이 들어간 콘티들에서도 같이 빠져.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "삭제에 실패했어요");
      router.push("/songs");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1.5">제목</label>
          <input
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">템포</label>
          <select
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          >
            {Object.entries(TEMPO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">카테고리 (분위기)</label>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="예: 엠비언트, 경쾌한, 웅장한"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">라이브러리에서 횟수 대신 표시</label>
          <select
            value={roleTag}
            onChange={(e) => setRoleTag(e.target.value)}
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          >
            <option value="">횟수 표시 (기본)</option>
            {ROLE_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              <Check size={16} strokeWidth={2} />
              저장
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setTitleKo(song.titleKo);
                setTempo(song.tempo);
                setMood(song.mood ?? "");
                setRoleTag(song.roleTag ?? "");
                setError(null);
              }}
              className="flex items-center gap-1.5 bg-accent-soft text-ink-soft px-4 py-2 rounded-lg text-sm font-medium"
            >
              <X size={16} strokeWidth={2} />
              취소
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-red-600 text-sm disabled:opacity-40"
          >
            <Trash2 size={16} strokeWidth={2} />
            {deleting ? "삭제 중..." : "곡 삭제"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between">
        <h1 className="font-serif text-2xl font-semibold mb-2">{song.titleKo}</h1>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-accent shrink-0 mt-1.5"
        >
          <Pencil size={14} strokeWidth={2} />
          수정
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">
          {TEMPO_LABEL[song.tempo] ?? song.tempo}
        </span>
        {song.mood && <span className="text-xs px-2 py-0.5 rounded-full bg-gold-soft text-gold">{song.mood}</span>}
        {song.roleTag && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white">{song.roleTag}</span>
        )}
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
