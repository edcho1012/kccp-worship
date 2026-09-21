"use client";

import { useEffect, useState } from "react";
import { Pin } from "lucide-react";

type MinistryYear = {
  label: string;
  entranceSong: { titleKo: string } | null;
  confessionSong: { titleKo: string } | null;
};

export default function SettingsPage() {
  const [year, setYear] = useState<MinistryYear | null>(null);
  const [entrance, setEntrance] = useState("");
  const [confession, setConfession] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ministry-years")
      .then((res) => res.json())
      .then((data: MinistryYear) => {
        setYear(data);
        setEntrance(data.entranceSong?.titleKo ?? "");
        setConfession(data.confessionSong?.titleKo ?? "");
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/ministry-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entranceTitle: entrance, confessionTitle: confession }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "저장에 실패했어요");
      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="flex items-center gap-2 mb-1">
        <Pin size={20} className="text-gold" strokeWidth={2} />
        <h1 className="font-serif text-2xl font-semibold">사역년도 고정곡</h1>
      </div>
      <p className="text-sm text-ink-soft mb-8">
        {year ? `${year.label} 사역년도 (8월~7월)` : "불러오는 중..."} 기준으로 저장돼요.
        매년 8월에 새 사역년도가 시작되면 여기서 다시 설정하면 돼.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">입례곡</label>
          <input
            value={entrance}
            onChange={(e) => setEntrance(e.target.value)}
            placeholder="예: 다 감사드리며"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">공동체 고백송</label>
          <input
            value={confession}
            onChange={(e) => setConfession(e.target.value)}
            placeholder="예: 사도신경"
            className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {saved && <p className="text-accent text-sm">저장했어요.</p>}

        <button
          type="submit"
          disabled={saving || !entrance || !confession}
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
