"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STABILITY_BATCH_TYPES,
  STABILITY_BATCH_LABELS,
  STABILITY_TIMEPOINTS,
  STABILITY_TIMEPOINT_LABELS,
} from "@/lib/constants";

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

export default function StabilityGrid({
  productId,
  initialReports,
  canEdit,
}: {
  productId: number;
  initialReports: StabilityReport[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<StabilityReport[]>(initialReports);
  const [busyCell, setBusyCell] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, StabilityReport>();
    for (const r of reports) m.set(`${r.batchType}:${r.timepoint}`, r);
    return m;
  }, [reports]);

  const upsert = (r: StabilityReport) => {
    setReports((prev) => {
      const next = prev.filter((x) => !(x.batchType === r.batchType && x.timepoint === r.timepoint));
      return [...next, r];
    });
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
      // Refetch all reports for this product to get the updated state incl. new file
      const listRes = await fetch(`/api/stability?productId=${productId}`);
      if (listRes.ok) setReports(await listRes.json());
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
      const listRes = await fetch(`/api/stability?productId=${productId}`);
      if (listRes.ok) setReports(await listRes.json());
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
        upsert(updated);
        router.refresh();
      }
    } finally {
      setBusyCell(null);
    }
  };

  return (
    <div className="space-y-6">
      {STABILITY_BATCH_TYPES.map((batchType) => (
        <section key={batchType} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            {STABILITY_BATCH_LABELS[batchType]}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STABILITY_TIMEPOINTS.map((tp) => {
              const r = byKey.get(`${batchType}:${tp}`);
              const status = r?.status ?? "pending";
              const files = r?.files ?? [];
              const busy = busyCell === `${batchType}:${tp}`;
              const isDone = status === "completed";
              return (
                <div
                  key={tp}
                  className={`rounded border p-3 ${
                    isDone ? "border-green-300 bg-green-50/40" : "border-gray-200 bg-gray-50/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        isDone ? "bg-green-500" : status === "na" ? "bg-gray-300" : "bg-red-300"
                      }`}
                      aria-label={status}
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {STABILITY_TIMEPOINT_LABELS[tp]}
                    </span>
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {files.map((f) => (
                        <li key={f.id} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="text-green-600">&#128196;</span>
                          <a
                            href={`/api/stability/files/${f.id}`}
                            className="truncate hover:underline max-w-[160px]"
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
                        <span>+ 보고서 업로드</span>
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
      ))}
    </div>
  );
}
