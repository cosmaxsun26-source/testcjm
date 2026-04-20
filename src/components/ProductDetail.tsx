"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PROCESS_PHASES, CATEGORIES, UV_FILTER_TYPES, FORMULATION_TYPES, PRODUCT_TYPES, CONTAINER_TYPES, DEV_TEAMS, FILE_UPLOADABLE_STEPS } from "@/lib/constants";
import { isOverdue } from "@/lib/overdue";

interface StepFile {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  uploadedAt: string | Date;
}

interface ProcessStep {
  id: number;
  productId: number;
  stepKey: string;
  status: string;
  note: string | null;
  dueDate: string | null;
  completedDate: string | null;
  files: StepFile[];
}

interface Product {
  id: number;
  no: number | null;
  category: string;
  customer: string | null;
  productName: string;
  labNumber: string | null;
  bulkCode: string | null;
  bulkCodeName: string | null;
  productType: string | null;
  uvFilterType: string | null;
  formulation: string | null;
  spf: string | null;
  broadSpectrum: string | null;
  waterResistant: string | null;
  container: string | null;
  volume: string | null;
  devTeam: string | null;
  formulator: string | null;
  salesManager: string | null;
  devNote: string | null;
  targetDate: string | null;
  devStatus: string | null;
  formulationConfirmed: string | null;
  activeIngredients: string | null;
  clinicalTrial: string | null;
  uniiCode: string | null;
  preservative: string | null;
  labBatchCT: string | null;
  tmvTmt: string | null;
  rawMaterialQual: string | null;
  trialMfg: string | null;
  trialMfgDate: string | null;
  bulkShelfLife: string | null;
  bulkShelfLifeDate: string | null;
  fillingPackaging: string | null;
  labStability: string | null;
  drugStability: string | null;
  productReg: string | null;
  importReg: string | null;
  production: string | null;
  validation: string | null;
  drugStability2: string | null;
  shipment: string | null;
  steps: ProcessStep[];
}

const EMPTY_PRODUCT = {
  category: "24년사전확보",
  productName: "",
  customer: "",
  labNumber: "",
  bulkCode: "",
  bulkCodeName: "",
  productType: "",
  uvFilterType: "",
  formulation: "",
  spf: "",
  broadSpectrum: "",
  waterResistant: "",
  container: "",
  volume: "",
  devTeam: "",
  formulator: "",
  salesManager: "",
  devNote: "",
  targetDate: "",
  devStatus: "",
  formulationConfirmed: "",
  activeIngredients: "",
  clinicalTrial: "",
  uniiCode: "",
  preservative: "",
  labBatchCT: "",
  tmvTmt: "",
  rawMaterialQual: "",
  trialMfg: "",
  trialMfgDate: "",
  bulkShelfLife: "",
  bulkShelfLifeDate: "",
  fillingPackaging: "",
  labStability: "",
  drugStability: "",
  productReg: "",
  importReg: "",
  production: "",
  validation: "",
  drugStability2: "",
  shipment: "",
};

export default function ProductDetail({ product }: { product: Product | null }) {
  const router = useRouter();
  const isNew = !product;
  const [form, setForm] = useState(product ? { ...product } : { ...EMPTY_PRODUCT });
  const [steps, setSteps] = useState<ProcessStep[]>(product?.steps || []);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "process">("info");

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const updateStep = (stepKey: string, status: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.stepKey === stepKey ? { ...s, status } : s))
    );
  };

  const updateStepDueDate = (stepKey: string, dueDate: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.stepKey === stepKey ? { ...s, dueDate: dueDate || null } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew ? "/api/products" : `/api/products/${product!.id}`;
      const method = isNew ? "POST" : "PUT";

      const { id, steps: _s, ...data } = form as Record<string, unknown>;
      const body: Record<string, unknown> = { ...data };
      if (!isNew) {
        body.steps = steps.map((s) => ({
          stepKey: s.stepKey,
          status: s.status,
          note: s.note,
          dueDate: s.dueDate,
          completedDate: s.completedDate,
        }));
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved = await res.json();
        router.push(`/products/${saved.id}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    field,
    type = "text",
    options,
    textarea,
  }: {
    label: string;
    field: string;
    type?: string;
    options?: readonly string[];
    textarea?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {options ? (
        <select
          className="w-full border rounded-md px-2 py-1.5 text-sm"
          value={(form as Record<string, string>)[field] || ""}
          onChange={(e) => set(field, e.target.value)}
        >
          <option value="">선택</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          className="w-full border rounded-md px-2 py-1.5 text-sm h-20"
          value={(form as Record<string, string>)[field] || ""}
          onChange={(e) => set(field, e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="w-full border rounded-md px-2 py-1.5 text-sm"
          value={(form as Record<string, string>)[field] || ""}
          onChange={(e) => set(field, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            &larr; 목록으로
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isNew ? "신규 제품 등록" : form.productName}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "저장중..." : isNew ? "등록" : "저장"}
        </button>
      </div>

      {!isNew && (
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("info")}
          >
            제품 정보
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "process"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("process")}
          >
            프로세스 단계
          </button>
        </div>
      )}

      {(isNew || activeTab === "info") && (
        <div className="space-y-6">
          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">기본 정보</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="카테고리" field="category" options={CATEGORIES} />
              <Field label="제품명" field="productName" />
              <Field label="고객사" field="customer" />
              <Field label="랩넘버" field="labNumber" />
              <Field label="벌크코드" field="bulkCode" />
              <Field label="벌크코드명" field="bulkCodeName" />
            </div>
          </section>

          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">제품 사양</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="유형" field="productType" options={PRODUCT_TYPES} />
              <Field label="자차구성" field="uvFilterType" options={UV_FILTER_TYPES} />
              <Field label="제형" field="formulation" options={FORMULATION_TYPES} />
              <Field label="SPF" field="spf" />
              <Field label="Broad Spectrum" field="broadSpectrum" options={["O", "X"]} />
              <Field label="지속내수" field="waterResistant" options={["O", "X", "-"]} />
              <Field label="용기" field="container" options={CONTAINER_TYPES} />
              <Field label="용량" field="volume" />
            </div>
          </section>

          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">담당</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="개발팀" field="devTeam" options={DEV_TEAMS} />
              <Field label="제형담당" field="formulator" />
              <Field label="영업담당" field="salesManager" />
              <Field label="완료 목표일" field="targetDate" type="month" />
              <Field label="개발사항" field="devStatus" />
              <Field label="제형확정" field="formulationConfirmed" />
            </div>
          </section>

          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">개발 상세</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="처방개발 진행사항" field="devNote" textarea />
              <Field label="주성분구성" field="activeIngredients" />
              <Field label="임상 결과" field="clinicalTrial" textarea />
              <Field label="UNII CODE" field="uniiCode" textarea />
              <Field label="방부력" field="preservative" />
              <Field label="랩배치 CT" field="labBatchCT" />
              <Field label="TMV/TMT" field="tmvTmt" textarea />
            </div>
          </section>

          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">시험생산 / 양산</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="원료적격성평가" field="rawMaterialQual" />
              <Field label="시험제조(1배치)" field="trialMfg" />
              <Field label="충전/포장" field="fillingPackaging" />
              <Field label="랩 Stability" field="labStability" textarea />
              <Field label="Drug Stability(외부)" field="drugStability" />
              <Field label="제품등록" field="productReg" />
              <Field label="Import등록" field="importReg" />
            </div>
          </section>
        </div>
      )}

      {!isNew && activeTab === "process" && (
        <div className="space-y-6">
          {PROCESS_PHASES.map((phase) => (
            <section key={phase.name} className="bg-white rounded-lg border p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                {phase.name}
                <span className="text-gray-400 font-normal ml-2">{phase.duration}</span>
              </h2>
              <div className="mt-3 space-y-3">
                {phase.steps.map((stepDef) => {
                  const step = steps.find((s) => s.stepKey === stepDef.key);
                  const status = step?.status || "pending";
                  const files = step?.files || [];
                  const overdue = step ? isOverdue(step.dueDate, step.status) : false;
                  return (
                    <div
                      key={stepDef.key}
                      className={`py-2 px-3 rounded border ${
                        overdue
                          ? "border-red-300 bg-red-50/40"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            status === "completed" ? "bg-green-500" : "bg-red-400"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                            {stepDef.label}
                            {overdue ? (
                              <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                                지연 (목표일 {step?.dueDate})
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-400">{stepDef.team}</div>
                        </div>
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="hidden md:inline">목표일</span>
                          <input
                            type="month"
                            className={`rounded border px-1.5 py-0.5 text-xs ${
                              overdue ? "border-red-400 text-red-700" : "border-gray-200 text-gray-600"
                            }`}
                            value={step?.dueDate ?? ""}
                            onChange={(e) => updateStepDueDate(stepDef.key, e.target.value)}
                            disabled={!step}
                          />
                        </label>
                        <select
                          className={`text-xs rounded-full px-3 py-1 border-0 font-medium ${
                            status === "completed"
                              ? "bg-green-100 text-green-700"
                              : status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : status === "na"
                              ? "bg-gray-50 text-gray-400"
                              : "bg-gray-100 text-gray-600"
                          }`}
                          value={status}
                          onChange={(e) => updateStep(stepDef.key, e.target.value)}
                        >
                          <option value="pending">미진행</option>
                          <option value="in_progress">진행중</option>
                          <option value="completed">완료</option>
                          <option value="na">해당없음</option>
                        </select>
                      </div>

                      {/* 파일 목록 (허용 스텝만) */}
                      {FILE_UPLOADABLE_STEPS.includes(stepDef.key) && files.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1">
                          {files.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-green-600">&#128196;</span>
                              <a
                                href={`/api/files/${f.id}`}
                                className="hover:text-blue-600 hover:underline truncate max-w-[200px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {f.originalName}
                              </a>
                              <span className="text-gray-400">
                                ({(f.fileSize / 1024).toFixed(0)}KB)
                              </span>
                              <button
                                onClick={async () => {
                                  if (!confirm(`"${f.originalName}" 파일을 삭제하시겠습니까?`)) return;
                                  await fetch(`/api/files/${f.id}`, { method: "DELETE" });
                                  router.refresh();
                                  // 로컬 상태도 업데이트
                                  setSteps((prev) =>
                                    prev.map((s) =>
                                      s.stepKey === stepDef.key
                                        ? {
                                            ...s,
                                            files: s.files.filter((sf) => sf.id !== f.id),
                                            status: s.files.length <= 1 ? "pending" : s.status,
                                          }
                                        : s
                                    )
                                  );
                                }}
                                className="text-red-400 hover:text-red-600 ml-1"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 파일 업로드 (허용 스텝만) */}
                      {FILE_UPLOADABLE_STEPS.includes(stepDef.key) && step && status !== "na" && (
                        <div className="mt-2 ml-6">
                          <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                            <span>+ 파일 첨부</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const fd = new FormData();
                                fd.append("file", file);
                                fd.append("productId", String(step.productId));
                                fd.append("stepKey", stepDef.key);
                                const res = await fetch("/api/files", { method: "POST", body: fd });
                                if (res.ok) {
                                  const newFile = await res.json();
                                  setSteps((prev) =>
                                    prev.map((s) =>
                                      s.stepKey === stepDef.key
                                        ? { ...s, status: "completed", files: [...s.files, newFile] }
                                        : s
                                    )
                                  );
                                  router.refresh();
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
