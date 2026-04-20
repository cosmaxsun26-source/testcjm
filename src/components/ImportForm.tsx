"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StatusCounts = { pending: number; in_progress: number; completed: number; na: number };

type Summary = {
  total: number;
  importable: number;
  skipped: number;
  withIssues: number;
  byCategory: Record<string, number>;
  totalStatus: StatusCounts;
  duplicates: Array<{ currentRow: number; firstRow: number; excelNo: string | null; productName: string }>;
  preview: Array<{ rowNo: number; excelNo: string | null; category: string; productName: string; statusCounts: StatusCounts }>;
  skippedRows: Array<{ rowNo: number; issues: string[] }>;
};

export default function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [truncate, setTruncate] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "commit">(null);
  const [error, setError] = useState<string>("");
  const [committed, setCommitted] = useState<{ inserted: number } | null>(null);

  const submit = async (mode: "preview" | "commit") => {
    if (!file) {
      setError("파일을 선택하세요.");
      return;
    }
    setBusy(mode);
    setError("");
    if (mode === "preview") setCommitted(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      if (truncate) fd.append("truncate", "true");
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setSummary(json.summary);
      if (mode === "commit") {
        setCommitted(json.result);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">xlsx 파일</label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSummary(null);
              setCommitted(null);
              setError("");
            }}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
          />
          {file ? (
            <p className="mt-1 text-xs text-gray-500">
              {file.name} · {(file.size / 1024).toFixed(0)}KB
            </p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={truncate}
            onChange={(e) => setTruncate(e.target.checked)}
          />
          기존 제품 전부 삭제 후 재임포트 (위험: 업로드 이력 포함 cascade)
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit("preview")}
            disabled={!file || busy !== null}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "preview" ? "Preview 중..." : "Preview"}
          </button>
          <button
            onClick={() => {
              if (truncate && !confirm("기존 Product 전체를 삭제합니다. 계속하시겠습니까?")) return;
              submit("commit");
            }}
            disabled={!file || !summary || busy !== null}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "commit" ? "Commit 중..." : "Commit"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {committed ? (
          <p className="rounded bg-green-50 p-2 text-sm text-green-700">
            ✓ {committed.inserted}건 반영되었습니다.
          </p>
        ) : null}
      </section>

      {summary ? <SummaryPanel summary={summary} /> : null}
    </div>
  );
}

function SummaryPanel({ summary }: { summary: Summary }) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="총 row 스캔" value={summary.total} />
        <Stat label="임포트 대상" value={summary.importable} />
        <Stat label="건너뜀" value={summary.skipped} tone={summary.skipped ? "warn" : undefined} />
        <Stat label="경고 있음" value={summary.withIssues} tone={summary.withIssues ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">카테고리 분포</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(summary.byCategory).map(([k, v]) => (
              <li key={k} className="flex justify-between text-gray-700">
                <span>{k}</span>
                <span className="font-medium">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">스텝 상태 합계</h3>
          <ul className="space-y-1 text-sm">
            {(["completed", "in_progress", "pending", "na"] as const).map((k) => (
              <li key={k} className="flex justify-between text-gray-700">
                <span>{k}</span>
                <span className="font-medium">{summary.totalStatus[k]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {summary.duplicates.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/40 p-4">
          <h3 className="mb-2 text-sm font-semibold text-yellow-800">
            중복 ({summary.duplicates.length})
          </h3>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-yellow-800">
            {summary.duplicates.slice(0, 20).map((d, i) => (
              <li key={i}>
                row {d.currentRow} ↔ row {d.firstRow}: NO={d.excelNo ?? "-"} · {d.productName}
              </li>
            ))}
            {summary.duplicates.length > 20 && (
              <li className="text-yellow-700">...그 외 {summary.duplicates.length - 20}건</li>
            )}
          </ul>
        </div>
      )}

      {summary.skippedRows.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-800">
            건너뛴 row ({summary.skippedRows.length})
          </h3>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-red-800">
            {summary.skippedRows.map((r) => (
              <li key={r.rowNo}>
                row {r.rowNo}: {r.issues.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">첫 5개 미리보기</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-2 py-1 text-left">row</th>
              <th className="px-2 py-1 text-left">NO</th>
              <th className="px-2 py-1 text-left">카테고리</th>
              <th className="px-2 py-1 text-left">제품명</th>
              <th className="px-2 py-1 text-right">완료/진행/대기/NA</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {summary.preview.map((p) => (
              <tr key={p.rowNo} className="border-t">
                <td className="px-2 py-1 text-gray-500">{p.rowNo}</td>
                <td className="px-2 py-1 text-gray-700">{p.excelNo ?? "-"}</td>
                <td className="px-2 py-1 text-gray-700">{p.category}</td>
                <td className="px-2 py-1 text-gray-900 truncate max-w-[320px]">{p.productName}</td>
                <td className="px-2 py-1 text-right text-gray-600">
                  {p.statusCounts.completed}/{p.statusCounts.in_progress}/{p.statusCounts.pending}/{p.statusCounts.na}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`rounded-lg border p-3 ${
        isWarn ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className={`text-xs ${isWarn ? "text-yellow-700" : "text-gray-500"}`}>{label}</p>
      <p className={`mt-1 text-xl font-bold ${isWarn ? "text-yellow-800" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
