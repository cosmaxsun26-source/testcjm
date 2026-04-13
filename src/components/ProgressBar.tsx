"use client";

interface Step {
  stepKey: string;
  status: string;
}

export default function ProgressBar({ steps }: { steps: Step[] }) {
  const total = steps.filter((s) => s.status !== "na").length;
  const completed = steps.filter((s) => s.status === "completed").length;
  const inProgress = steps.filter((s) => s.status === "in_progress").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
          <div
            className="bg-blue-400 transition-all"
            style={{ width: `${inProgressPct}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{pct}%</span>
    </div>
  );
}
