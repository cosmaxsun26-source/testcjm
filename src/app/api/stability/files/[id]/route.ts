import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { requireSession, requireEditor } from "@/lib/auth-helpers";

function parseFileId(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { id: null as null, error: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  }
  return { id: n, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id: raw } = await params;
  const { id, error: idError } = parseFileId(raw);
  if (idError) return idError;

  const f = await prisma.stabilityFile.findUnique({
    where: { id },
    include: { report: true },
  });
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(
    process.cwd(),
    "uploads",
    String(f.report.productId),
    "stability",
    f.report.batchType,
    f.report.timepoint,
    f.fileName
  );

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.originalName)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireEditor();
  if (error) return error;

  const { id: raw } = await params;
  const { id, error: idError } = parseFileId(raw);
  if (idError) return idError;

  const f = await prisma.stabilityFile.findUnique({
    where: { id },
    include: { report: { include: { files: true } } },
  });
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(
    process.cwd(),
    "uploads",
    String(f.report.productId),
    "stability",
    f.report.batchType,
    f.report.timepoint,
    f.fileName
  );
  try { await unlink(filePath); } catch { /* already gone */ }

  const remaining = f.report.files.length - 1;
  const shouldRevert = remaining <= 0;

  await prisma.$transaction(async (tx) => {
    await tx.stabilityFile.delete({ where: { id } });
    if (shouldRevert) {
      await tx.stabilityReport.update({
        where: { id: f.reportId },
        data: { status: "pending" },
      });
    }
  });

  return NextResponse.json({ success: true, reverted: shouldRevert });
}
