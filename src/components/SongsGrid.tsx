"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, ListOrdered, CheckSquare, Square, X } from "lucide-react";

const TEMPO_OPTIONS: { key: string; label: string }[] = [
  { key: "HIGH", label: "High" },
  { key: "MID_HIGH", label: "Mid-high" },
  { key: "MID", label: "Mid" },
  { key: "LOW", label: "Low" },
];

export type SongForGrid = {
  id: string;
  titleKo: string;
  tempo: string;
  mood: string | null;
  roleTag: string | null;
  count: number;
};

export default function SongsGrid({ songs }: { songs: SongForGrid[] }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"alpha" | "count">("alpha");
  const [tempoFilter, setTempoFilter] = useState<Set<string>>(
    new Set(TEMPO_OPTIONS.map((t) => t.key)) // 기본은 전부 선택 (다 보임)
  );
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTempo, setBulkTempo] = useState("HIGH");
  const [applying, setApplying] = useState(false);

  function toggleTempoFilter(key: string) {
    setTempoFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 필터에서 선택된 템포만, 각각 그룹으로 묶어서 정렬
  const groups = useMemo(() => {
    return TEMPO_OPTIONS.filter((t) => tempoFilter.has(t.key)).map((t) => ({
      ...t,
      songs: songs
        .filter((s) => s.tempo === t.key)
        .sort((a, b) =>
          sortBy === "alpha" ? a.titleKo.localeCompare(b.titleKo, "ko") : b.count - a.count
        ),
    }));
  }, [songs, tempoFilter, sortBy]);

  async function applyBulkTempo() {
    if (selectedIds.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch("/api/songs/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), tempo: bulkTempo }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "일괄 변경에 실패했어요");
      setSelectedIds(new Set());
      setSelectMode(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 필터 + 정렬 + 선택 모드 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft mr-1">템포:</span>
        {TEMPO_OPTIONS.map(({ key, label }) => {
          const active = tempoFilter.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleTempoFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
              }`}
            >
              {label}
            </button>
          );
        })}

        <span className="text-sm text-ink-soft mx-1">|</span>

        <button
          onClick={() => setSortBy("alpha")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            sortBy === "alpha" ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <ArrowDownAZ size={16} strokeWidth={2} />
          가나다순
        </button>
        <button
          onClick={() => setSortBy("count")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            sortBy === "count" ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <ListOrdered size={16} strokeWidth={2} />
          횟수순
        </button>

        <span className="text-sm text-ink-soft mx-1">|</span>

        <button
          onClick={() => {
            setSelectMode((v) => !v);
            setSelectedIds(new Set());
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectMode ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <CheckSquare size={16} strokeWidth={2} />
          {selectMode ? "선택 모드 끄기" : "여러 곡 선택"}
        </button>
      </div>

      {/* 선택 모드일 때 일괄 변경 바 */}
      {selectMode && (
        <div className="rounded-lg border border-line bg-paper-raised p-3 flex items-center gap-3 text-sm">
          <span className="text-ink-soft">{selectedIds.size}곡 선택됨</span>
          <select
            value={bulkTempo}
            onChange={(e) => setBulkTempo(e.target.value)}
            className="border border-line rounded-lg px-2.5 py-1.5 text-sm bg-paper"
          >
            {TEMPO_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={applyBulkTempo}
            disabled={selectedIds.size === 0 || applying}
            className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
          >
            {applying ? "변경 중..." : "선택한 곡 템포 일괄 변경"}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 text-ink-soft"
            >
              <X size={14} strokeWidth={2} />
              선택 해제
            </button>
          )}
        </div>
      )}

      {/* 곡 그리드: 템포별로 묶어서, 필터에서 선택된 것만 */}
      {groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="text-sm font-medium text-ink-soft mb-3">{group.label}</h2>
              {group.songs.length > 0 ? (
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {group.songs.map((song) => {
                    const selected = selectedIds.has(song.id);
                    return (
                      <li key={song.id}>
                        <Link
                          href={selectMode ? "#" : `/songs/${song.id}`}
                          onClick={(e) => {
                            if (selectMode) {
                              e.preventDefault();
                              toggleSelect(song.id);
                            }
                          }}
                          className={`relative block border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            selected
                              ? "border-accent bg-accent-soft"
                              : "border-line bg-paper-raised hover:border-accent/40 hover:bg-accent-soft/40"
                          }`}
                        >
                          {selectMode && (
                            <span className="absolute top-2 right-2 text-accent">
                              {selected ? (
                                <CheckSquare size={16} />
                              ) : (
                                <Square size={16} className="text-ink-soft" />
                              )}
                            </span>
                          )}
                          <div className="truncate pr-5">{song.titleKo}</div>
                          <div className="mt-1">
                            {song.roleTag ? (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent text-white">
                                {song.roleTag}
                              </span>
                            ) : (
                              <span className="text-xs text-ink-soft">{song.count}회</span>
                            )}
                          </div>
                          {song.mood && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gold-soft text-gold">
                              {song.mood}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">아직 없어요.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft py-8 text-center">템포를 하나 이상 선택해줘.</p>
      )}
    </div>
  );
}
