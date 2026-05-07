import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import {
  PROCESS_PHASES,
  ALL_STEPS,
  CATEGORIES,
  STEP_STATUS_OPTIONS,
  STABILITY_BATCH_TYPES,
  STABILITY_TIMEPOINTS,
} from "@/lib/constants";
import { isOverdue, parseDueDate } from "@/lib/overdue";
import { hasDelayedStability } from "@/lib/stability-dates";

export const dynamic = "force-dynamic";

const STEP_LABEL = new Map<string, string>(ALL_STEPS.map((s) => [s.key, s.label]));
const STATUS_META = new Map<string, { value: string; label: string; color: string }>(
  STEP_STATUS_OPTIONS.map((s) => [s.value, { value: s.value, label: s.label, color: s.color }])
);
const PHASE_KEY_SETS = PROCESS_PHASES.map(
  (p) => new Set<string>(p.steps.map((s) => s.key))
);
const FINAL_STEP_KEY = "shipment";
const SHIP_PHASE_KEYS = PHASE_KEY_SETS[PHASE_KEY_SETS.length - 1];

function formatKstDateTime(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type ProductRow = {
  id: number;
  productName: string;
  category: string;
  customer: string | null;
  formulator: string | null;
  devTeam: string | null;
  steps: { stepKey: string; status: string; dueDate: string | null }[];
  stabilityReports: { batchType: string; timepoint: string; status: string }[];
  stabilityBatches: { batchType: string; startDate: string | null }[];
};

type FunnelStage = { name: string; count: number };

function classifyProductPhase(steps: ProductRow["steps"]): string {
  const byKey = new Map(steps.map((s) => [s.stepKey, s.status]));
  if (byKey.get(FINAL_STEP_KEY) === "completed") return "출시 완료";
  for (let i = PROCESS_PHASES.length - 1; i >= 0; i--) {
    const phase = PROCESS_PHASES[i];
    const hasActivity = phase.steps.some((s) => {
      const status = byKey.get(s.key);
      return status === "in_progress" || status === "completed";
    });
    if (hasActivity) return phase.name;
  }
  return PROCESS_PHASES[0].name; // 미진입 → 개발 단계로 간주
}

function shipReadiness(steps: ProductRow["steps"]): number {
  let total = 0;
  let done = 0;
  for (const s of steps) {
    if (!SHIP_PHASE_KEYS.has(s.stepKey)) continue;
    if (s.status === "na") continue;
    total++;
    if (s.status === "completed") done++;
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export default async function DashboardPage() {
  const [products, history] = await Promise.all([
    prisma.product.findMany({
      include: {
        steps: { select: { stepKey: true, status: true, dueDate: true } },
        stabilityReports: { select: { batchType: true, timepoint: true, status: true } },
        stabilityBatches: { select: { batchType: true, startDate: true } },
      },
      orderBy: { no: "asc" },
    }),
    prisma.stepHistory.findMany({
      take: 15,
      orderBy: { changedAt: "desc" },
      include: {
        product: { select: { id: true, productName: true } },
        changedBy: { select: { name: true } },
        step: { select: { stepKey: true } },
      },
    }),
  ]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const totalProducts = products.length;

  // 카테고리별 카운트
  const countsByCategory = CATEGORIES.map((cat) => ({
    name: cat,
    count: products.filter((p) => p.category === cat).length,
  }));

  // 전체 step 상태 합계
  const statusCounts = { pending: 0, in_progress: 0, completed: 0, na: 0 };
  for (const p of products) {
    for (const s of p.steps) {
      if (s.status in statusCounts) statusCounts[s.status as keyof typeof statusCounts]++;
    }
  }
  const totalSteps = statusCounts.pending + statusCounts.in_progress + statusCounts.completed + statusCounts.na;
  const overallProgressPct =
    totalSteps - statusCounts.na > 0
      ? Math.round((statusCounts.completed / (totalSteps - statusCounts.na)) * 100)
      : 0;

  // 지연 항목
  const overdueItems = products
    .flatMap((p) =>
      p.steps
        .filter((s) => isOverdue(s.dueDate, s.status, now))
        .map((s) => ({
          productId: p.id,
          productName: p.productName,
          formulator: p.formulator,
          stepKey: s.stepKey,
          dueDate: s.dueDate,
          status: s.status,
        }))
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  // 7일 내 마감 임박 (today < dueDate <= today+7)
  const upcomingItems = products
    .flatMap((p) =>
      p.steps
        .filter((s) => {
          if (s.status === "completed" || s.status === "na") return false;
          const due = parseDueDate(s.dueDate);
          if (!due) return false;
          return due >= today && due <= sevenDays;
        })
        .map((s) => ({
          productId: p.id,
          productName: p.productName,
          formulator: p.formulator,
          stepKey: s.stepKey,
          dueDate: s.dueDate,
        }))
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  // Phase Funnel — 각 제품을 어느 phase로 분류
  const funnelMap = new Map<string, number>([
    ["개발 단계", 0],
    ["시험생산 단계", 0],
    ["양산/출고 단계", 0],
    ["출시 완료", 0],
  ]);
  for (const p of products) {
    const phase = classifyProductPhase(p.steps);
    funnelMap.set(phase, (funnelMap.get(phase) ?? 0) + 1);
  }
  const funnelStages: FunnelStage[] = Array.from(funnelMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  // 출시 임박 TOP 5 — 양산/출고 phase 진입 + 진척률 높은 순
  const shipImminent = products
    .map((p) => ({
      id: p.id,
      productName: p.productName,
      customer: p.customer,
      formulator: p.formulator,
      readiness: shipReadiness(p.steps),
      shipped: p.steps.find((s) => s.stepKey === FINAL_STEP_KEY)?.status === "completed",
    }))
    .filter((p) => p.readiness > 0 && !p.shipped)
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, 5);

  // Phase 진행률 (기존)
  const phaseProgress = PROCESS_PHASES.map((phase, idx) => {
    const phaseKeys = PHASE_KEY_SETS[idx];
    let total = 0;
    let completed = 0;
    for (const p of products) {
      for (const s of p.steps) {
        if (!phaseKeys.has(s.stepKey)) continue;
        if (s.status === "na") continue;
        total++;
        if (s.status === "completed") completed++;
      }
    }
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { name: phase.name, duration: phase.duration, total, completed, pct };
  });

  // 카테고리 × Phase 매트릭스 (제품 단위로 phase 분류)
  const categoryMatrix = CATEGORIES.map((cat) => {
    const inCat = products.filter((p) => p.category === cat);
    const counts = new Map<string, number>([
      ["개발 단계", 0],
      ["시험생산 단계", 0],
      ["양산/출고 단계", 0],
      ["출시 완료", 0],
    ]);
    for (const p of inCat) {
      const phase = classifyProductPhase(p.steps);
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
    }
    return {
      name: cat,
      total: inCat.length,
      stages: Array.from(counts.entries()).map(([k, v]) => ({ name: k, count: v })),
    };
  });

  // 고객사 TOP 8
  const byCustomer = new Map<
    string,
    { products: number; completedSteps: number; totalSteps: number }
  >();
  for (const p of products) {
    const c = p.customer?.trim();
    if (!c) continue;
    const cur = byCustomer.get(c) ?? { products: 0, completedSteps: 0, totalSteps: 0 };
    cur.products++;
    for (const s of p.steps) {
      if (s.status === "na") continue;
      cur.totalSteps++;
      if (s.status === "completed") cur.completedSteps++;
    }
    byCustomer.set(c, cur);
  }
  const customerTop = Array.from(byCustomer.entries())
    .map(([name, v]) => ({
      name,
      products: v.products,
      pct: v.totalSteps > 0 ? Math.round((v.completedSteps / v.totalSteps) * 100) : 0,
    }))
    .sort((a, b) => b.products - a.products)
    .slice(0, 8);

  // Drug Stability RED 제품
  const stabilityRedProducts = products.filter((p) =>
    hasDelayedStability(
      p.stabilityReports,
      p.stabilityBatches,
      STABILITY_BATCH_TYPES,
      STABILITY_TIMEPOINTS,
      now
    )
  );

  // 담당자별 부하 (제형담당자 기준)
  const byFormulator = new Map<
    string,
    { products: Set<number>; inProgress: number; overdue: number }
  >();
  for (const p of products) {
    const f = p.formulator?.trim();
    if (!f) continue;
    const cur = byFormulator.get(f) ?? {
      products: new Set<number>(),
      inProgress: 0,
      overdue: 0,
    };
    cur.products.add(p.id);
    for (const s of p.steps) {
      if (s.status === "in_progress") cur.inProgress++;
      if (isOverdue(s.dueDate, s.status, now)) cur.overdue++;
    }
    byFormulator.set(f, cur);
  }
  const formulatorLoad = Array.from(byFormulator.entries())
    .map(([name, v]) => ({
      name,
      products: v.products.size,
      inProgress: v.inProgress,
      overdue: v.overdue,
    }))
    .sort((a, b) => b.inProgress - a.inProgress || b.products - a.products)
    .slice(0, 10);

  // 출시 진입 (양산/출고 phase 1단계 이상 활성)
  const shipPhaseEntered = products.filter(
    (p) => classifyProductPhase(p.steps) === "양산/출고 단계"
  ).length;
  const shipped = products.filter(
    (p) => p.steps.find((s) => s.stepKey === FINAL_STEP_KEY)?.status === "completed"
  ).length;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">경영 대시보드</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              기준일 {formatKstDateTime(now)} · 총 {totalProducts}개 제품 · 전체 진척 {overallProgressPct}%
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            제품 목록 →
          </Link>
        </div>

        {/* 핵심 KPI 8개 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="전체 제품" value={totalProducts} sub="등록된 OTC 파이프라인" />
          {countsByCategory.map((c) => (
            <Card key={c.name} label={c.name} value={c.count} />
          ))}
          <Card
            label="양산 진입"
            value={shipPhaseEntered}
            sub={`출시 완료 ${shipped}개`}
            tone={shipPhaseEntered > 0 ? "good" : undefined}
          />
          <Card
            label="진행중 단계"
            value={statusCounts.in_progress}
            sub={`완료 ${statusCounts.completed} · 대기 ${statusCounts.pending}`}
          />
          <Card
            label="지연 단계"
            value={overdueItems.length}
            sub={overdueItems.length === 0 ? "목표일 데이터 없음" : "목표일 초과"}
            tone={overdueItems.length > 0 ? "danger" : undefined}
          />
          <Card
            label="Stability RED"
            value={stabilityRedProducts.length}
            sub="배치 시작일 +30일 경과 미보고"
            tone={stabilityRedProducts.length > 0 ? "danger" : undefined}
          />
        </section>

        {/* Funnel + Donut */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="단계별 파이프라인" subtitle="제품 단위로 도달한 가장 진행된 단계">
            <Funnel stages={funnelStages} />
          </Panel>
          <Panel title="전체 단계 상태 분포" subtitle={`${totalSteps - statusCounts.na}개 단계 · 해당없음 ${statusCounts.na}개 제외`}>
            <Donut
              segments={[
                { label: "완료", value: statusCounts.completed, color: "#16a34a" },
                { label: "진행중", value: statusCounts.in_progress, color: "#2563eb" },
                { label: "대기", value: statusCounts.pending, color: "#9ca3af" },
              ]}
            />
          </Panel>
        </section>

        {/* 출시 임박 + 카테고리×Phase */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="출시 임박 TOP 5" subtitle="양산/출고 단계 진척률 기준">
            {shipImminent.length === 0 ? (
              <EmptyHint text="아직 양산/출고 단계 진입 제품이 없습니다." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {shipImminent.map((p) => (
                  <li key={p.id} className="py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-gray-900 hover:underline truncate flex-1"
                      >
                        {p.productName}
                      </Link>
                      <span className="text-xs text-gray-500 shrink-0">{p.customer ?? "-"}</span>
                      <span className="text-sm font-semibold text-blue-700 tabular-nums w-12 text-right">
                        {p.readiness}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
                      <div className="h-full bg-blue-500" style={{ width: `${p.readiness}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="카테고리 × 단계 분포" subtitle="제품이 어느 단계에 몰려있나">
            <div className="space-y-4">
              {categoryMatrix.map((cat) => (
                <CategoryStackedBar key={cat.name} cat={cat} />
              ))}
            </div>
          </Panel>
        </section>

        {/* 고객사 TOP 8 */}
        <Panel title="고객사 파이프라인 TOP 8" subtitle="제품 수 기준, 진척률 함께 표시">
          {customerTop.length === 0 ? (
            <EmptyHint text="고객사 정보가 입력된 제품이 없습니다." />
          ) : (
            <div className="space-y-2">
              {customerTop.map((c) => (
                <div key={c.name} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 font-medium text-gray-800">{c.name}</span>
                  <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(c.products / customerTop[0].products) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-gray-700 tabular-nums">
                    {c.products}개
                  </span>
                  <span className="w-16 text-right text-xs text-gray-500 tabular-nums">
                    진척 {c.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 리스크 보드 3컬럼 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel
            title="지연 항목"
            subtitle={`목표일 초과 · ${overdueItems.length}건`}
            tone={overdueItems.length > 0 ? "danger" : undefined}
          >
            {overdueItems.length === 0 ? (
              <EmptyHint text="목표일이 입력된 단계가 아직 없습니다. 단계별 목표일을 채우면 자동으로 표시됩니다." />
            ) : (
              <RiskList
                items={overdueItems.slice(0, 8).map((i) => ({
                  productId: i.productId,
                  productName: i.productName,
                  stepLabel: STEP_LABEL.get(i.stepKey) ?? i.stepKey,
                  meta: `목표일 ${i.dueDate}${i.formulator ? ` · ${i.formulator}` : ""}`,
                  tone: "danger",
                  badge: "지연",
                }))}
              />
            )}
          </Panel>

          <Panel
            title="7일 내 마감"
            subtitle={`${upcomingItems.length}건`}
            tone={upcomingItems.length > 0 ? "warn" : undefined}
          >
            {upcomingItems.length === 0 ? (
              <EmptyHint text="다가오는 마감 데이터가 없습니다 (목표일 미입력)." />
            ) : (
              <RiskList
                items={upcomingItems.slice(0, 8).map((i) => ({
                  productId: i.productId,
                  productName: i.productName,
                  stepLabel: STEP_LABEL.get(i.stepKey) ?? i.stepKey,
                  meta: `${i.dueDate}${i.formulator ? ` · ${i.formulator}` : ""}`,
                  tone: "warn",
                  badge: "임박",
                }))}
              />
            )}
          </Panel>

          <Panel
            title="Drug Stability RED"
            subtitle={`${stabilityRedProducts.length}건 · 보고 지연`}
            tone={stabilityRedProducts.length > 0 ? "danger" : undefined}
          >
            {stabilityRedProducts.length === 0 ? (
              <EmptyHint text="현재 Stability 보고 지연 제품 없음." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {stabilityRedProducts.slice(0, 8).map((p) => (
                  <li key={p.id} className="py-2 text-sm flex items-center gap-2">
                    <span className="inline-flex shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                      RED
                    </span>
                    <Link
                      href={`/stability/${p.id}`}
                      className="truncate text-gray-900 hover:underline flex-1"
                    >
                      {p.productName}
                    </Link>
                    {p.customer ? (
                      <span className="text-xs text-gray-500 shrink-0">{p.customer}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        {/* 담당자 부하 */}
        <Panel title="제형담당자 업무 부하" subtitle="진행중 단계 수 기준 TOP 10">
          {formulatorLoad.length === 0 ? (
            <EmptyHint text="제형담당자가 지정된 제품이 없습니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2 pr-3 font-medium">담당자</th>
                    <th className="py-2 pr-3 font-medium text-right">제품 수</th>
                    <th className="py-2 pr-3 font-medium text-right">진행중 단계</th>
                    <th className="py-2 pr-3 font-medium text-right">지연 단계</th>
                    <th className="py-2 pl-3 font-medium">부하 분포</th>
                  </tr>
                </thead>
                <tbody>
                  {formulatorLoad.map((f) => (
                    <tr key={f.name} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-medium text-gray-800">{f.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                        {f.products}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-blue-700 font-medium">
                        {f.inProgress}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {f.overdue > 0 ? (
                          <span className="text-red-700 font-medium">{f.overdue}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-2 pl-3 w-1/3">
                        <div className="h-2 rounded bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(f.inProgress / formulatorLoad[0].inProgress) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* 단계별 진척도 (기존 유지) */}
        <Panel title="단계별 진척도" subtitle="개발 → 시험생산 → 양산/출고 phase 완료율">
          <div className="space-y-3">
            {phaseProgress.map((phase) => (
              <div key={phase.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">
                    {phase.name} <span className="text-gray-400">({phase.duration})</span>
                  </span>
                  <span className="text-gray-600">
                    {phase.completed} / {phase.total} · {phase.pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
                  <div className="h-full bg-blue-500" style={{ width: `${phase.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* 최근 이력 */}
        <Panel title="최근 상태 변경 이력" subtitle="최근 15건">
          {history.length === 0 ? (
            <EmptyHint text="아직 기록된 변경이 없습니다." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.map((h) => {
                const newMeta = STATUS_META.get(h.newStatus);
                const oldMeta = h.oldStatus ? STATUS_META.get(h.oldStatus) : null;
                return (
                  <li key={h.id} className="py-2 text-sm flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-32 shrink-0">
                      {formatKstDateTime(h.changedAt)}
                    </span>
                    <Link
                      href={`/products/${h.product.id}`}
                      className="truncate text-gray-900 hover:underline max-w-[22ch]"
                    >
                      {h.product.productName}
                    </Link>
                    <span className="text-gray-500">
                      {STEP_LABEL.get(h.step.stepKey) ?? h.step.stepKey}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      {oldMeta ? (
                        <span className={`rounded px-1.5 py-0.5 ${oldMeta.color}`}>
                          {oldMeta.label}
                        </span>
                      ) : (
                        <span className="text-gray-400">신규</span>
                      )}
                      <span className="text-gray-400">→</span>
                      {newMeta ? (
                        <span className={`rounded px-1.5 py-0.5 ${newMeta.color}`}>
                          {newMeta.label}
                        </span>
                      ) : (
                        <span>{h.newStatus}</span>
                      )}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {h.changedBy?.name ?? "-"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </main>
    </>
  );
}

/* ─── UI 부속 컴포넌트들 ──────────────────────────────────────── */

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "danger" | "warn" | "good";
}) {
  const styles = {
    danger: { box: "border-red-300 bg-red-50", label: "text-red-700", value: "text-red-700", sub: "text-red-600" },
    warn: { box: "border-amber-300 bg-amber-50", label: "text-amber-700", value: "text-amber-700", sub: "text-amber-600" },
    good: { box: "border-emerald-300 bg-emerald-50", label: "text-emerald-700", value: "text-emerald-700", sub: "text-emerald-600" },
    none: { box: "border-gray-200 bg-white", label: "text-gray-500", value: "text-gray-900", sub: "text-gray-400" },
  };
  const s = styles[tone ?? "none"];
  return (
    <div className={`rounded-lg border p-4 ${s.box}`}>
      <p className={`text-xs font-medium ${s.label}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${s.value}`}>{value}</p>
      {sub ? <p className={`mt-0.5 text-xs ${s.sub}`}>{sub}</p> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  tone,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "danger" | "warn";
}) {
  const border =
    tone === "danger"
      ? "border-red-200 bg-red-50/30"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/30"
        : "border-gray-200 bg-white";
  return (
    <section className={`rounded-lg border ${border} p-4`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center text-xs text-gray-500">
      {text}
    </div>
  );
}

function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#16a34a"];

  return (
    <ul className="space-y-3">
      {stages.map((s, i) => {
        const widthPct = (s.count / max) * 100;
        const sharePct = total > 0 ? Math.round((s.count / total) * 100) : 0;
        const color = COLORS[i] ?? "#9ca3af";
        return (
          <li key={s.name} className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 w-32 shrink-0">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="font-medium text-gray-800">{s.name}</span>
            </div>
            <div className="flex-1 h-7 rounded bg-gray-100 overflow-hidden relative">
              <div
                className="h-full"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
            </div>
            <span className="tabular-nums font-semibold text-gray-900 w-10 text-right">
              {s.count}
            </span>
            <span className="tabular-nums text-xs text-gray-500 w-10 text-right">
              {sharePct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Donut({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  const arcs = segments.reduce<{ label: string; color: string; len: number; offset: number }[]>(
    (acc, s) => {
      const len = total > 0 ? (s.value / total) * C : 0;
      const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].len;
      acc.push({ label: s.label, color: s.color, len, offset });
      return acc;
    },
    []
  );

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0 -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#f3f4f6" strokeWidth="28" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth="28"
            strokeDasharray={`${a.len} ${C - a.len}`}
            strokeDashoffset={-a.offset}
          />
        ))}
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="22"
          fontWeight="700"
          fill="#111827"
          transform="rotate(90 100 100)"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums text-gray-900">
                {s.value}
              </span>
              <span className="w-10 text-right text-xs text-gray-500 tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CategoryStackedBar({
  cat,
}: {
  cat: { name: string; total: number; stages: { name: string; count: number }[] };
}) {
  const COLORS: Record<string, string> = {
    "개발 단계": "#3b82f6",
    "시험생산 단계": "#6366f1",
    "양산/출고 단계": "#8b5cf6",
    "출시 완료": "#16a34a",
  };
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="font-medium text-gray-800">{cat.name}</span>
        <span className="text-xs text-gray-500">총 {cat.total}개</span>
      </div>
      <div className="flex h-6 rounded overflow-hidden border border-gray-200">
        {cat.stages.map((s) => {
          const w = cat.total > 0 ? (s.count / cat.total) * 100 : 0;
          if (w === 0) return null;
          return (
            <div
              key={s.name}
              className="flex items-center justify-center text-[10px] font-medium text-white"
              style={{ width: `${w}%`, backgroundColor: COLORS[s.name] ?? "#9ca3af" }}
              title={`${s.name} ${s.count}개`}
            >
              {w >= 8 ? s.count : ""}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-gray-500">
        {cat.stages.map((s) => (
          <span key={s.name} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: COLORS[s.name] ?? "#9ca3af" }}
            />
            {s.name} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskList({
  items,
}: {
  items: {
    productId: number;
    productName: string;
    stepLabel: string;
    meta: string;
    tone: "danger" | "warn";
    badge: string;
  }[];
}) {
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((i, idx) => {
        const badgeColor =
          i.tone === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
        return (
          <li key={`${i.productId}-${idx}`} className="py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${badgeColor}`}>
                {i.badge}
              </span>
              <Link
                href={`/products/${i.productId}`}
                className="truncate text-gray-900 hover:underline flex-1"
              >
                {i.productName}
              </Link>
            </div>
            <div className="mt-0.5 ml-1 text-xs text-gray-500">
              {i.stepLabel} · {i.meta}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
