"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Layers, Link as LinkIcon } from "lucide-react";

function submitForm(url: string, form: FormData, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("서버 응답을 읽을 수 없어요"));
        }
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error ?? "업로드에 실패했어요"));
        } catch {
          reject(new Error("업로드에 실패했어요"));
        }
      }
    };

    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했어요"));
    xhr.send(form);
  });
}

function isTransientError(message: string) {
  return message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand");
}

type Mode = "file" | "text" | "bulk";

export default function UploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [youtubePlaylist, setYoutubePlaylist] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "retrying">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ createdCount: number; errors: string[] } | null>(null);

  const loading = phase !== "idle";

  async function runUpload(attempt = 0) {
    setPhase("uploading");
    setProgress(0);
    setError(null);
    setBulkResult(null);

    const form = new FormData();
    if ((mode === "file" || mode === "bulk") && file) form.append("file", file);
    if (mode === "text" && text) form.append("text", text);
    if (mode !== "bulk" && youtubePlaylist.trim()) form.append("youtubePlaylist", youtubePlaylist.trim());

    const endpoint = mode === "bulk" ? "/api/setlists/bulk" : "/api/setlists";

    try {
      const result = await submitForm(endpoint, form, (pct) => {
        setProgress(pct);
        if (pct >= 100) setPhase("processing");
      });

      if (mode === "bulk") {
        setBulkResult({ createdCount: result.createdCount, errors: result.errors ?? [] });
        setPhase("idle");
      } else {
        router.push("/setlists");
      }
    } catch (err: any) {
      if (attempt < 2 && isTransientError(err.message)) {
        setPhase("retrying");
        setTimeout(() => runUpload(attempt + 1), 2000 * (attempt + 1));
        return;
      }
      setError(err.message);
      setPhase("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runUpload();
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl font-semibold mb-1">콘티 업로드</h1>
      <p className="text-sm text-ink-soft mb-8">
        {mode === "bulk"
          ? "여러 주 콘티가 합쳐진 파일을 올리면, 주 단위로 나눠서 한 번에 등록해줘."
          : "이번 주 콘티를 파일이나 텍스트로 올려줘."}
      </p>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "file" ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <UploadCloud size={18} strokeWidth={2} />
          파일 업로드
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "text" ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <FileText size={18} strokeWidth={2} />
          텍스트 입력
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "bulk" ? "bg-accent text-white" : "bg-accent-soft text-ink-soft"
          }`}
        >
          <Layers size={18} strokeWidth={2} />
          여러 주 한번에
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="콘티 내용을 그대로 붙여넣어줘. 날짜, 곡 제목 순서 그대로."
            className="w-full border border-line rounded-xl p-4 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
          />
        ) : (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-14 cursor-pointer transition-colors ${
              dragOver ? "border-accent bg-accent-soft/50" : "border-line hover:border-accent/50 hover:bg-accent-soft/30"
            }`}
          >
            {mode === "bulk" ? (
              <Layers size={32} className="text-accent" strokeWidth={1.75} />
            ) : (
              <UploadCloud size={32} className="text-accent" strokeWidth={1.75} />
            )}
            <span className="text-sm text-ink-soft text-center px-6">
              {file
                ? file.name
                : mode === "bulk"
                ? "여러 주 콘티가 합쳐진 PDF를 끌어다 놓거나 선택해줘 (용량 커도 돼)"
                : "PDF나 이미지 파일을 끌어다 놓거나 선택해줘"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}

        {mode !== "bulk" && (
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <LinkIcon size={16} className="text-accent" strokeWidth={2} />
              유튜브 플레이리스트 (선택)
            </label>
            <input
              value={youtubePlaylist}
              onChange={(e) => setYoutubePlaylist(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="w-full border border-line rounded-lg px-3.5 py-2.5 text-sm bg-paper-raised focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
            />
            <p className="text-xs text-ink-soft mt-1.5">
              이 위에 곡 몇 개가 이번 주 플레이리스트로 새로 들어온 걸 보면 곡 제목을 비교해서, Gemini가 직접 들어보고 분위기(엠비언트, 경쾌 등)를 자동으로 설정해.
            </p>
          </div>
        )}

        {phase === "uploading" && (
          <div>
            <div className="h-2 rounded-full bg-accent-soft overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-ink-soft mt-1.5">업로드 중... {progress}%</p>
          </div>
        )}
        {phase === "processing" && (
          <p className="text-sm text-ink-soft">
            {mode === "bulk"
              ? "여러 주로 나눠서 분석 중이에요. 파일이 크면 몇 분 걸릴 수 있어요..."
              : "콘티 분석 중..."}
          </p>
        )}
        {phase === "retrying" && (
          <p className="text-sm text-ink-soft">서버가 잠깐 혼잡했어요. 다시 시도하는 중...</p>
        )}

        {bulkResult && (
          <div className="rounded-lg border border-line bg-paper-raised p-4 text-sm space-y-2">
            <p className="font-medium">{bulkResult.createdCount}개의 주간 콘티를 찾아서 등록했어요.</p>
            {bulkResult.errors.length > 0 && (
              <div className="text-red-600">
                <p className="font-medium">일부 조각은 실패했어요:</p>
                <ul className="list-disc list-inside">
                  {bulkResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => router.push("/setlists")}
              className="text-accent underline underline-offset-2"
            >
              콘티 기록에서 확인하기
            </button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || (mode === "text" ? !text : !file)}
          className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {loading ? "처리 중..." : "업로드"}
        </button>
      </form>
    </div>
  );
}
