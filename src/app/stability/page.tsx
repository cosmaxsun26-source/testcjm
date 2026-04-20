import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { STABILITY_BATCH_TYPES, STABILITY_TIMEPOINTS } from "@/lib/constants";
import { hasRedStability } from "@/lib/stability-dates";

export const dynamic = "force-dynamic";

const TOTAL_CELLS = STABILITY_BATCH_TYPES.length * STABILITY_TIMEPOINTS.length;

export default async function StabilityOverviewPage() {
  const products = await prisma.product.findMany({
    include: {
      stabilityReports: { select: { batchType: true, timepoint: true, status: true } },
      stabilityBatches: { select: { batchType: true, startDate: true } },
    },
    orderBy: { no: "asc" },
  });

  const now = new Date();

  const rows = products
    .map((p) => {
      const doneBy = (bt: string) =>
        p.stabilityReports.filter((r) => r.batchType === bt && r.status === "completed").length;
      const completed = p.stabilityReports.filter((r) => r.status === "completed").length;
      const hasRed = hasRedStability(
        p.stabilityReports,
        p.stabilityBatches,
        STABILITY_BATCH_TYPES,
        STABILITY_TIMEPOINTS,
        now,
      );
      return {
        id: p.id,
        no: p.no,
        productName: p.productName,
        customer: p.customer,
        formulator: p.formulator,
        completed,
        hasRed,
        trialDone: doneBy("trial"),
        prod1Done: doneBy("production_1"),
        prod2Done: doneBy("production_2"),
      };
    })
    .sort((a, b) => Number(b.hasRed) - Number(a.hasRed) || b.completed - a.completed);

  const withAny = rows.filter((r) => r.completed > 0).length;
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const redCount = rows.filter((r) => r.hasRed).length;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Drug Stability</h1>
          <p className="mt-1 text-sm text-gray-600">
            제품별 장기 안정성 시험(2 배치 × 6 타임포인트 = 12 보고서) 현황.
            보고서 파일을 업로드하면 자동으로 해당 타임포인트가 완료로 표시됩니다.
          </p>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="전체 제품" value={rows.length} />
          <Card label="시험 진행 중" value={withAny} sub={`≥1건 제출`} />
          <Card label="제출된 보고서" value={totalCompleted} sub={`/ 총 ${rows.length * TOTAL_CELLS}`} />
          <Card
            label="지연 제품"
            value={redCount}
            sub={redCount > 0 ? "목표일 +30일 초과" : "모두 일정 내"}
            tone={redCount > 0 ? "danger" : undefined}
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr className="border-b">
                <th className="px-3 py-2 text-left">No</th>
                <th className="px-3 py-2 text-left">제품명</th>
                <th className="px-3 py-2 text-left">고객사</th>
                <th className="px-3 py-2 text-left">제형담당</th>
                <th className="px-3 py-2 text-center">시험생산</th>
                <th className="px-3 py-2 text-center">본생산 1차</th>
                <th className="px-3 py-2 text-center">본생산 2차</th>
                <th className="px-3 py-2 text-right">진행률</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = Math.round((r.completed / TOTAL_CELLS) * 100);
                return (
                  <tr key={r.id} className={`border-b hover:bg-gray-50 ${r.hasRed ? "bg-red-50/30" : ""}`}>
                    <td className="px-3 py-2 text-gray-500">{r.no ?? "-"}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 max-w-[280px] truncate">
                      <span className="inline-flex items-center gap-2">
                        {r.hasRed ? (
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
                            title="목표일 +30일 경과 (지연)"
                          />
                        ) : null}
                        <Link href={`/stability/${r.id}`} className="hover:underline">
                          {r.productName}
                        </Link>
                        {r.hasRed ? (
                          <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            지연
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.customer ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-600">{r.formulator ?? "-"}</td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {r.trialDone} / {STABILITY_TIMEPOINTS.length}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {r.prod1Done} / {STABILITY_TIMEPOINTS.length}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {r.prod2Done} / {STABILITY_TIMEPOINTS.length}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/stability/${r.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        상세 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "danger";
}) {
  const danger = tone === "danger";
  return (
    <div className={`rounded-lg border p-4 ${danger ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
      <p className={`text-xs font-medium ${danger ? "text-red-700" : "text-gray-500"}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${danger ? "text-red-700" : "text-gray-900"}`}>{value}</p>
      {sub ? <p className={`mt-0.5 text-xs ${danger ? "text-red-600" : "text-gray-400"}`}>{sub}</p> : null}
    </div>
  );
}
