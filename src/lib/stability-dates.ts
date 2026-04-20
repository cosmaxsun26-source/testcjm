import { STABILITY_TIMEPOINTS, type StabilityTimepoint } from "./constants";

const GRACE_DAYS = 30;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type StabilityLight = "green" | "yellow" | "red" | "purple" | "gray";

export function parseIsoDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(ISO_RE);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addMonths(start: Date, months: number): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

export function timepointMonths(tp: StabilityTimepoint | string): number {
  const m = tp.match(/^(\d+)m$/);
  return m ? parseInt(m[1], 10) : 0;
}

export function expectedDateFor(
  startDate: string | null | undefined,
  timepoint: StabilityTimepoint | string
): string | null {
  const start = parseIsoDate(startDate);
  if (!start) return null;
  const months = timepointMonths(timepoint);
  if (months <= 0) return null;
  return toIso(addMonths(start, months));
}

export function stabilityLight(
  status: string | null | undefined,
  startDate: string | null | undefined,
  timepoint: StabilityTimepoint | string,
  now: Date = new Date()
): StabilityLight {
  // 결과 상태 — 일정과 무관
  if (status === "passed") return "green";
  if (status === "failed" || status === "notes") return "red";
  if (status === "na") return "gray";

  // 일정 기반 — pending 상태에서만 평가
  const expected = parseIsoDate(expectedDateFor(startDate, timepoint));
  if (!expected) return "gray";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delayThreshold = new Date(expected);
  delayThreshold.setDate(delayThreshold.getDate() + GRACE_DAYS);

  if (today > delayThreshold) return "purple"; // 지연
  return "yellow";
}

// Helper: compute all 6 expected dates for a batch given its start
export function allExpectedDates(startDate: string | null | undefined): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const tp of STABILITY_TIMEPOINTS) {
    out[tp] = expectedDateFor(startDate, tp);
  }
  return out;
}

// 제품에 지연(purple) 셀이 하나라도 있는지. 즉 예상일 +30일이 지났는데
// 아직 보고서가 업로드되지 않은(pending) 셀. startDate 미설정 배치는
// 지연 대상이 아니다.
export function hasDelayedStability(
  reports: Array<{ batchType: string; timepoint: string; status: string }>,
  batches: Array<{ batchType: string; startDate: string | null }>,
  batchTypes: readonly string[],
  timepoints: readonly string[],
  now: Date = new Date()
): boolean {
  const reportByKey = new Map<string, { status: string }>();
  for (const r of reports) reportByKey.set(`${r.batchType}:${r.timepoint}`, r);
  const startByType = new Map<string, string | null>();
  for (const b of batches) startByType.set(b.batchType, b.startDate);

  for (const bt of batchTypes) {
    const start = startByType.get(bt);
    if (!start) continue;
    for (const tp of timepoints) {
      const r = reportByKey.get(`${bt}:${tp}`);
      if (stabilityLight(r?.status, start, tp, now) === "purple") return true;
    }
  }
  return false;
}
