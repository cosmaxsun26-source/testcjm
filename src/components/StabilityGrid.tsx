"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STABILITY_BATCH_TYPES,
  STABILITY_BATCH_LABELS,
  STABILITY_TIMEPOINTS,
  STABILITY_TIMEPOINT_LABELS,
} from "@/lib/constants";
import { expectedDateFor, stabilityLight, type StabilityLight } from "@/lib/stability-dates";

type StabilityFile = {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  uploadedAt: string | Date;
};

type StabilityReport = {
  id: number;
  productId: number;
  batchType: string;
  timepoint: string;
  status: string;
  note: string | null;
  files: StabilityFile[];
};

type StabilityBatch = {
  id: number;
  productId: number;
  batchType: string;
  startDate: string | null;
};

const LIGHT_CLASS: Record<StabilityLight, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  gray: "bg-gray-300",
};
const LIGHT_LABEL: Record<StabilityLight, string> = {
  green: "업로드 완료",
  yellow: "일정 도래 전 또는 30일 유예 내",
  red: "목표일 +30일 경과 (지연)",
  gray: "일정 미설정 또는 해당없음",
};
const CELL_BG: Record<StabilityLight, string> = {
  green: "border-green-300 bg-green-50/40",
  yellow: "border-yellow-300 bg-yellow-50/40",
  red: "border-red-400 bg-red-50/60",
  gray: "border-gray-200 bg-gray-50/30",
};

export default function StabilityGrid({
  productId,
  initialReports,
  initialBatches,
  canEdit,
}: {
  productId: number;
  initialReports: StabilityReport[];
  initialBatches: StabilityBatch[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<StabilityReport[]>(initialReports);
  const [batches, setBatches] = useState<StabilityBatch[]>(initialBatches);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [savingBatch, setSavingBatch] = useState<string | null>(null);

  // Re-render once per minute so the light recomputes if the page stays open overnight.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const reportByKey = useMemo(() => {
    const m = new Map<string, StabilityReport>();
    for (const r of reports) m.set(`${r.batchType}:${r.timepoint}`, r);
    return m;
  }, [reports]);

  const batchByType = useMemo(() => {
    const m = new Map<string, StabilityBatch>();
    for (const b of batches) m.set(b.batchType, b);
    return m;
  }, [batches]);

  const reloadAll = async () => {
    const res = await fetch(`/api/stability?productId=${productId}`);
    if (res.ok) {
      const json = await res.json();
      setReports(json.reports ?? []);
      setBatches(json.batches ?? []);
    }
  };

  const upsertReport = (r: StabilityReport) => {
    setReports((prev) => [
      ...prev.filter((x) => !(x.batchType === r.batchType && x.timepoint === r.timepoint)),
      r,
    ]);
  };

  const upsertBatch = (b: StabilityBatch) => {
    setBatches((prev) => [...prev.filter((x) => x.batchType !== b.batchType), b]);
  };

  const handleStartDate = async (batchType: string, startDate: string) => {
    setSavingBatch(batchType);
    try {
      const res = await fetch("/api/stability/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, batchType, startDate: startDate || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        upsertBatch(updated);
        router.refresh();
      } else {
        alert("시작일 저장 실패");
      }
    } finally {
      setSavingBatch(null);
    }
  };

  const handleUpload = async (batchType: string, timepoint: string, file: File) => {
    const key = `${batchType}:${timepoint}`;
    setBusyCell(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productId", String(productId));
      fd.append("batchType", batchType);
      fd.append("timepoint", timepoint);
      const res = await fetch("/api/stability/files", { method: "POST", body: fd });
      if (!res.ok) {
        alert("업로드 실패");
        return;
      }
      await reloadAll();
      router.refresh();
    } finally {
      setBusyCell(null);
    }
  };

  const handleDeleteFile = async (batchType: string, timepoint: string, fileId: number, name: string) => {
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    const key = `${batchType}:${timepoint}`;
    setBusyCell(key);
    try {
      const res = await fetch(`/api/stability/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        alert("삭제 실패");
        return;
      }
      await reloadAll();
      router.refresh();
    } finally {
      setBusyCell(null);
    }
  };

  const handleStatus = async (batchType: string, timepoint: string, status: string) => {
    const key = `${batchType}:${timepoint}`;
    setBusyCell(key);
    try {
      const res = await fetch("/api/stability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, batchType, timepoint, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        upsertReport(updated);
        router.refresh();
      }
    } finally {
      setBusyCell(null);
    }
  };

  return (
    <div className="space-y-4">
      <Legend />

      {STABILITY_BATCH_TYPES.map((batchType) => {
        const batch = batchByType.get(batchType);
        const start = batch?.startDate ?? null;
        const saving = savingBatch === batchType;
        return (
          <section key={batchType} className="rounded-lg border border-gray-200 bg-white p-4">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-800">
                {STABILITY_BATCH_LABELS[batchType]}
              </h2>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <span>시작일</span>
                <input
                  type="date"
                  value={start ?? ""}
                  disabled={!canEdit || saving}
                  onChange={(e) => handleStartDate(batchType, e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                />
                {!start && <span className="text-gray-400">— 설정 시 예상일 자동 계산</span>}
              </label>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {STABILITY_TIMEPOINTS.map((tp) => {
                const r = reportByKey.get(`${batchType}:${tp}`);
                const status = r?.status ?? "pending";
                const files = r?.files ?? [];
                const light = stabilityLight(status, start, tp, now);
                const expected = expectedDateFor(start, tp);
                const busy = busyCell === `${batchType}:${tp}`;
                return (
                  <div
                    key={tp}
                    className={`rounded border p-3 ${CELL_BG[light]}`}
                    title={LIGHT_LABEL[light]}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${LIGHT_CLASS[light]}`}
                        aria-label={light}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {STABILITY_TIMEPOINT_LABELS[tp]}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {expected ? `예상: ${expected}` : "시작일 미설정"}
                    </div>

                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {files.map((f) => (
                          <li key={f.id} className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="text-green-600">&#128196;</span>
                            <a
                              href={`/api/stability/files/${f.id}`}
                              className="truncate hover:underline max-w-[140px]"
                            >
                              {f.originalName}
                            </a>
                            <span className="text-gray-400">({(f.fileSize / 1024).toFixed(0)}KB)</span>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteFile(batchType, tp, f.id, f.originalName)}
                                className="ml-auto text-red-400 hover:text-red-600"
                                disabled={busy}
                              >
                                x
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {canEdit && (
                      <div className="mt-2 flex items-center justify-between">
                        <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                          <span>+ 보고서</span>
                          <input
                            type="file"
                            className="hidden"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(batchType, tp, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <select
                          className="text-[10px] border rounded px-1 py-0.5 bg-white text-gray-600"
                          value={status}
                          onChange={(e) => handleStatus(batchType, tp, e.target.value)}
                          disabled={busy}
                        >
                          <option value="pending">미진행</option>
                          <option value="completed">완료</option>
                          <option value="na">해당없음</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Legend() {
  const items: Array<{ light: StabilityLight; label: string }> = [
    { light: "green", label: "업로드 완료" },
    { light: "yellow", label: "일정 전 / 30일 유예 내" },
    { light: "red", label: "목표일 +30일 초과 (지연)" },
    { light: "gray", label: "시작일 미설정 / 해당없음" },
  ];
  return (
    <div className="flex flex-wrap gap-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
      {items.map((i) => (
        <span key={i.light} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${LIGHT_CLASS[i.light]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
