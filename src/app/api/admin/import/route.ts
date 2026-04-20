import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { parseWorkbook, buildReport, insertRows } from "@/lib/excel-import";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "preview");
  const truncate = formData.get("truncate") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "xlsx file required" }, { status: 400 });
  }

  let rows;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    rows = parseWorkbook(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `parse failed: ${msg}` }, { status: 400 });
  }

  const summary = buildReport(rows);

  if (mode === "preview") {
    return NextResponse.json({ mode: "preview", summary });
  }

  if (mode !== "commit") {
    return NextResponse.json({ error: "mode must be preview or commit" }, { status: 400 });
  }

  try {
    const result = await insertRows(prisma, rows, { truncate });
    return NextResponse.json({ mode: "commit", summary, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import] commit failed:", msg);
    return NextResponse.json({ error: `commit failed: ${msg}` }, { status: 500 });
  }
}
