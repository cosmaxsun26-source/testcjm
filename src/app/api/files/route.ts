import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string;
  const stepKey = formData.get("stepKey") as string;

  if (!file || !productId || !stepKey) {
    return NextResponse.json({ error: "file, productId, stepKey 필수" }, { status: 400 });
  }

  // 프로세스 단계 조회
  const step = await prisma.processStep.findUnique({
    where: {
      productId_stepKey: {
        productId: parseInt(productId),
        stepKey,
      },
    },
  });

  if (!step) {
    return NextResponse.json({ error: "단계를 찾을 수 없습니다" }, { status: 404 });
  }

  // 파일 저장 경로: uploads/{productId}/{stepKey}/
  const uploadDir = path.join(process.cwd(), "uploads", productId, stepKey);
  await mkdir(uploadDir, { recursive: true });

  // 파일명 충돌 방지
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = path.join(uploadDir, fileName);

  // 파일 저장
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // DB에 파일 기록 + 단계 상태를 completed로 변경
  const [stepFile] = await prisma.$transaction([
    prisma.stepFile.create({
      data: {
        stepId: step.id,
        fileName,
        originalName: file.name,
        fileSize: file.size,
      },
    }),
    prisma.processStep.update({
      where: { id: step.id },
      data: {
        status: "completed",
        completedDate: new Date().toISOString().split("T")[0],
      },
    }),
  ]);

  return NextResponse.json(stepFile, { status: 201 });
}
