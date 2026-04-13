"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";

interface ProcessStep {
  id: number;
  stepKey: string;
  status: string;
  files: { id: number }[];
}

interface Product {
  id: number;
  no: number | null;
  category: string;
  customer: string | null;
  productName: string;
  productType: string | null;
  uvFilterType: string | null;
  spf: string | null;
  devTeam: string | null;
  formulator: string | null;
  devStatus: string | null;
  targetDate: string | null;
  steps: ProcessStep[];
}

type SortKey = "devTeam" | "uvFilterType" | "formulator" | null;
type SortDir = "asc" | "desc";

const KEY_STEPS = [
  { key: "lab_batch_ct", label: "랩배치CT" },
  { key: "preservative", label: "방부력" },
  { key: "tmv_tmt", label: "TMV/TMT" },
  { key: "trial_mfg", label: "시험제조" },
] as const;

function StepLight({ steps, stepKey }: { steps: ProcessStep[]; stepKey: string }) {
  const step = steps.find((s) => s.stepKey === stepKey);
  const done = step?.status === "completed";
  const hasFiles = step?.files && step.files.length > 0;
  const fileCount = step?.files?.length || 0;
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        done ? "bg-green-500" : "bg-red-400"
      }`}
      title={done ? `완료${hasFiles ? ` (파일 ${fileCount}개)` : ""}` : "미완료"}
    />
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-0.5">↕</span>;
  return <span className="text-blue-600 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function ProductList({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = initialProducts.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (teamFilter && p.devTeam !== teamFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.productName.toLowerCase().includes(q) ||
          p.formulator?.toLowerCase().includes(q) ||
          p.customer?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        const va = (a[sortKey] || "").toLowerCase();
        const vb = (b[sortKey] || "").toLowerCase();
        const cmp = va.localeCompare(vb, "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [initialProducts, categoryFilter, teamFilter, search, sortKey, sortDir]);

  const getOverallStatus = (steps: ProcessStep[]) => {
    const active = steps.filter((s) => s.status !== "na");
    if (active.every((s) => s.status === "completed")) return "completed";
    if (active.some((s) => s.status === "in_progress" || s.status === "completed")) return "in_progress";
    return "pending";
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 제품을 삭제하시겠습니까?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const SortableHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-3 py-2 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600"
      onClick={() => handleSort(field)}
    >
      {label}
      <SortIcon active={sortKey === field} dir={sortDir} />
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="제품명, 담당자 검색..."
          className="border rounded-md px-3 py-1.5 text-sm flex-1 min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">전체 카테고리</option>
          <option value="24년사전확보">24년사전확보</option>
          <option value="26년확보목표">26년확보목표</option>
        </select>
        <select
          className="border rounded-md px-3 py-1.5 text-sm"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
        >
          <option value="">전체 팀</option>
          <option value="SC1">SC1</option>
          <option value="SC2">SC2</option>
          <option value="SC3">SC3</option>
        </select>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        총 {filtered.length}개 제품
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="px-3 py-2 font-medium text-gray-600">No</th>
              <th className="px-3 py-2 font-medium text-gray-600">제품명</th>
              <th className="px-3 py-2 font-medium text-gray-600">유형</th>
              <SortableHeader label="자차" field="uvFilterType" />
              <th className="px-3 py-2 font-medium text-gray-600">SPF</th>
              <SortableHeader label="팀" field="devTeam" />
              <SortableHeader label="담당" field="formulator" />
              <th className="px-3 py-2 font-medium text-gray-600">목표일</th>
              {KEY_STEPS.map((s) => (
                <th key={s.key} className="px-2 py-2 font-medium text-gray-600 text-center text-xs">
                  {s.label}
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-gray-600 w-28">진행률</th>
              <th className="px-3 py-2 font-medium text-gray-600">상태</th>
              <th className="px-3 py-2 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/products/${p.id}`)}
              >
                <td className="px-3 py-2 text-gray-500">{p.no}</td>
                <td className="px-3 py-2 font-medium text-gray-900 max-w-[260px] truncate">
                  {p.productName}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.productType || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{p.uvFilterType || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{p.spf || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{p.devTeam || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{p.formulator || "-"}</td>
                <td className="px-3 py-2 text-gray-600">{p.targetDate || "-"}</td>
                {KEY_STEPS.map((s) => (
                  <td key={s.key} className="px-2 py-2 text-center">
                    <StepLight steps={p.steps} stepKey={s.key} />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <ProgressBar steps={p.steps} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={getOverallStatus(p.steps)} size="xs" />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id, p.productName);
                    }}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
