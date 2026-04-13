"use client";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "미진행", className: "bg-gray-100 text-gray-600" },
  in_progress: { label: "진행중", className: "bg-blue-100 text-blue-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  na: { label: "해당없음", className: "bg-gray-50 text-gray-400" },
};

export default function StatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: "xs" | "sm";
}) {
  const info = STATUS_MAP[status] || STATUS_MAP.pending;
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span className={`inline-block rounded-full font-medium ${sizeClass} ${info.className}`}>
      {info.label}
    </span>
  );
}
