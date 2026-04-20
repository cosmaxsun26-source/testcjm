// dueDate는 YYYY-MM-DD(일 단위, 레거시) 또는 YYYY-MM(월 단위, 신규) 형식을 모두 수용.
// YYYY-MM은 "해당 월의 마지막 날"을 기한 경계로 해석한다. 즉 2026-07이면
// 2026-07-31까지는 기한 내이고, 2026-08-01부터 지연.
export function parseDueDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const day = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) {
    const [, y, m, d] = day;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const month = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const [, y, m] = month;
    // 해당 월의 마지막 날 — JS Date는 day=0으로 넘기면 전달 마지막 날을 준다
    const date = new Date(Number(y), Number(m), 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function isOverdue(
  dueDate: string | null | undefined,
  status: string,
  now: Date = new Date()
): boolean {
  if (status === "completed" || status === "na") return false;
  const due = parseDueDate(dueDate);
  if (!due) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}
