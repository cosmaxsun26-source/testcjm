import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { PROCESS_PHASES, ALL_STEPS, CATEGORIES, STEP_STATUS_OPTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STEP_LABEL = new Map<string, string>(ALL_STEPS.map((s) => [s.key, s.label]));
const STATUS_META = new Map<string, { value: string; label: string; color: string }>(
  STEP_STATUS_OPTIONS.map((s) => [s.value, { value: s.value, label: s.label, color: s.color }])
);

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

export default async function DashboardPage() {
  const [products, history] = await Promise.all([
    prisma.product.findMany({
      include: { steps: true },
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

  const totalProducts = products.length;

  const countsByCategory = CATEGORIES.map((cat) => ({
    name: cat,
    count: products.filter((p) => p.category === cat).length,
  }));

  const statusCounts = { pending: 0, in_progress: 0, completed: 0, na: 0 };
  for (const p of products) {
    for (const s of p.steps) {
      if (s.status in statusCounts) {
        statusCounts[s.status as keyof typeof statusCounts]++;
      }
    }
  }

  const phaseProgress = PROCESS_PHASES.map((phase) => {
    const phaseKeys = new Set<string>(phase.steps.map((s) => s.key));
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

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            제품 목록 →
          </Link>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="전체 제품" value={totalProducts} />
          {countsByCategory.map((c) => (
            <Card key={c.name} label={c.name} value={c.count} />
          ))}
          <Card
            label="완료 단계"
            value={statusCounts.completed}
            sub={`진행중 ${statusCounts.in_progress} · 대기 ${statusCounts.pending}`}
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">단계별 진척도</h2>
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
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${phase.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">최근 상태 변경 이력</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">아직 기록된 변경이 없습니다.</p>
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
        </section>
      </main>
    </>
  );
}

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-400">{sub}</p> : null}
    </div>
  );
}
