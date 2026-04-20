import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { STABILITY_BATCH_TYPES, STABILITY_TIMEPOINTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TOTAL_CELLS = STABILITY_BATCH_TYPES.length * STABILITY_TIMEPOINTS.length;

export default async function StabilityOverviewPage() {
  const products = await prisma.product.findMany({
    include: {
      stabilityReports: { select: { batchType: true, status: true } },
    },
    orderBy: { no: "asc" },
  });

  const rows = products
    .map((p) => {
      const completed = p.stabilityReports.filter((r) => r.status === "completed").length;
      const trialDone = p.stabilityReports.filter((r) => r.batchType === "trial" && r.status === "completed").length;
      const prodDone = p.stabilityReports.filter((r) => r.batchType === "production" && r.status === "completed").length;
      return {
        id: p.id,
        no: p.no,
        productName: p.productName,
        customer: p.customer,
        formulator: p.formulator,
        completed,
        trialDone,
        prodDone,
      };
    })
    .sort((a, b) => b.completed - a.completed);

  const withAny = rows.filter((r) => r.completed > 0).length;
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);

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
          <Card label="타임포인트" value={TOTAL_CELLS} sub="배치 2 × 시점 6" />
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
                <th className="px-3 py-2 text-center">본생산</th>
                <th className="px-3 py-2 text-right">진행률</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = Math.round((r.completed / TOTAL_CELLS) * 100);
                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{r.no ?? "-"}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 max-w-[280px] truncate">
                      <Link href={`/stability/${r.id}`} className="hover:underline">
                        {r.productName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.customer ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-600">{r.formulator ?? "-"}</td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {r.trialDone} / {STABILITY_TIMEPOINTS.length}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {r.prodDone} / {STABILITY_TIMEPOINTS.length}
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

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-400">{sub}</p> : null}
    </div>
  );
}
