import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireEditor } from "@/lib/auth-helpers";
import { STABILITY_BATCH_TYPES, STABILITY_TIMEPOINTS } from "@/lib/constants";

function parseProductId(raw: string | null) {
  if (!raw) return { id: null as null, error: NextResponse.json({ error: "productId required" }, { status: 400 }) };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { id: null as null, error: NextResponse.json({ error: "invalid productId" }, { status: 400 }) };
  }
  return { id: n, error: null };
}

const BATCH_SET = new Set<string>(STABILITY_BATCH_TYPES);
const TP_SET = new Set<string>(STABILITY_TIMEPOINTS);

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const { id: productId, error: idError } = parseProductId(request.nextUrl.searchParams.get("productId"));
  if (idError) return idError;

  const [reports, batches] = await Promise.all([
    prisma.stabilityReport.findMany({
      where: { productId },
      include: { files: { orderBy: { uploadedAt: "asc" } } },
      orderBy: [{ batchType: "asc" }, { timepoint: "asc" }],
    }),
    prisma.stabilityBatch.findMany({
      where: { productId },
      orderBy: { batchType: "asc" },
    }),
  ]);

  return NextResponse.json({ reports, batches });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireEditor();
  if (error) return error;

  const body = await request.json();
  const { productId: rawPid, batchType, timepoint, status, note } = body as {
    productId?: number;
    batchType?: string;
    timepoint?: string;
    status?: string;
    note?: string | null;
  };

  const productId = typeof rawPid === "number" ? rawPid : Number(rawPid);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid productId" }, { status: 400 });
  }
  if (!batchType || !BATCH_SET.has(batchType)) {
    return NextResponse.json({ error: "invalid batchType" }, { status: 400 });
  }
  if (!timepoint || !TP_SET.has(timepoint)) {
    return NextResponse.json({ error: "invalid timepoint" }, { status: 400 });
  }
  if (status && !["pending", "completed", "na"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const report = await prisma.stabilityReport.upsert({
    where: { productId_batchType_timepoint: { productId, batchType, timepoint } },
    update: {
      ...(status !== undefined ? { status } : {}),
      ...(note !== undefined ? { note } : {}),
    },
    create: {
      productId,
      batchType,
      timepoint,
      status: status ?? "pending",
      note: note ?? null,
    },
    include: { files: true },
  });

  return NextResponse.json(report);
}
