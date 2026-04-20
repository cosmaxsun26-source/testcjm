import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireEditor } from "@/lib/auth-helpers";
import { STABILITY_BATCH_TYPES, STABILITY_TIMEPOINTS } from "@/lib/constants";

const BATCH_SET = new Set<string>(STABILITY_BATCH_TYPES);
const TP_SET = new Set<string>(STABILITY_TIMEPOINTS);

export async function POST(request: NextRequest) {
  const { error } = await requireEditor();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  const productIdRaw = formData.get("productId");
  const batchType = String(formData.get("batchType") ?? "");
  const timepoint = String(formData.get("timepoint") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const productId = Number(productIdRaw);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid productId" }, { status: 400 });
  }
  if (!BATCH_SET.has(batchType)) {
    return NextResponse.json({ error: "invalid batchType" }, { status: 400 });
  }
  if (!TP_SET.has(timepoint)) {
    return NextResponse.json({ error: "invalid timepoint" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const uploadDir = path.join(process.cwd(), "uploads", String(productId), "stability", batchType, timepoint);
  await mkdir(uploadDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = path.join(uploadDir, fileName);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // upsert report + create file + auto-greenlight in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.stabilityReport.upsert({
      where: { productId_batchType_timepoint: { productId, batchType, timepoint } },
      update: { status: "completed" },
      create: { productId, batchType, timepoint, status: "completed" },
    });
    const created = await tx.stabilityFile.create({
      data: {
        reportId: report.id,
        fileName,
        originalName: file.name,
        fileSize: file.size,
      },
    });
    return { file: created, reportId: report.id };
  });

  return NextResponse.json(result.file, { status: 201 });
}
