"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";

interface ProcessStep {
  id: number;
  stepKey: string;
  status: string;
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

export default function ProductList({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const filtered = initialProducts.filter((p) => {
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="px-3 py-2 font-medium text-gray-600">No</th>
              <th className="px-3 py-2 font-medium text-gray-600">제품명</th>
              <th className="px-3 py-2 font-medium text-gray-600">유형</th>
              <th className="px-3 py-2 font-medium text-gray-600">자차</th>
              <th className="px-3 py-2 font-medium text-gray-600">SPF</th>
              <th className="px-3 py-2 font-medium text-gray-600">팀</th>
              <th className="px-3 py-2 font-medium text-gray-600">담당</th>
              <th className="px-3 py-2 font-medium text-gray-600">목표일</th>
              <th className="px-3 py-2 font-medium text-gray-600 w-32">진행률</th>
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
