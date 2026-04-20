import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { requireSession, requireEditor } from "@/lib/auth-helpers";
import { recordStatusChange } from "@/lib/audit";

// 파일 다운로드
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const stepFile = await prisma.stepFile.findUnique({
    where: { id: parseInt(id) },
    include: { step: true },
  });

  if (!stepFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "uploads",
    String(stepFile.step.productId),
    stepFile.step.stepKey,
    stepFile.fileName
  );

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(stepFile.originalName)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다" }, { status: 404 });
  }
}

// 파일 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireEditor();
  if (error) return error;

  const { id } = await params;
  const stepFile = await prisma.stepFile.findUnique({
    where: { id: parseInt(id) },
    include: { step: { include: { files: true } } },
  });

  if (!stepFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 디스크에서 삭제
  const filePath = path.join(
    process.cwd(),
    "uploads",
    String(stepFile.step.productId),
    stepFile.step.stepKey,
    stepFile.fileName
  );
  try { await unlink(filePath); } catch { /* 이미 없을 수 있음 */ }

  const remainingFiles = stepFile.step.files.length - 1;
  const shouldRevert = remainingFiles <= 0;

  await prisma.$transaction(async (tx) => {
    await tx.stepFile.delete({ where: { id: parseInt(id) } });

    if (shouldRevert) {
      await tx.processStep.update({
        where: { id: stepFile.step.id },
        data: { status: "pending", completedDate: null },
      });
      await recordStatusChange(tx, {
        stepId: stepFile.step.id,
        productId: stepFile.step.productId,
        oldStatus: stepFile.step.status,
        newStatus: "pending",
        changedByUserId: session.user.id,
        note: `파일 삭제로 자동 되돌림: ${stepFile.originalName}`,
      });
    }
  });

  return NextResponse.json({ success: true });
}
