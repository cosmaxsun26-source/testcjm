import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth-helpers";
import { STABILITY_BATCH_TYPES } from "@/lib/constants";

const BATCH_SET = new Set<string>(STABILITY_BATCH_TYPES);
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: NextRequest) {
  const { error } = await requireEditor();
  if (error) return error;

  const body = await request.json();
  const { productId: rawPid, batchType, startDate } = body as {
    productId?: number | string;
    batchType?: string;
    startDate?: string | null;
  };

  const productId = typeof rawPid === "number" ? rawPid : Number(rawPid);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid productId" }, { status: 400 });
  }
  if (!batchType || !BATCH_SET.has(batchType)) {
    return NextResponse.json({ error: "invalid batchType" }, { status: 400 });
  }
  // startDate must be null or ISO yyyy-mm-dd AND a real calendar date
  if (startDate !== null && startDate !== undefined && startDate !== "") {
    if (typeof startDate !== "string" || !ISO_RE.test(startDate)) {
      return NextResponse.json({ error: "startDate must be YYYY-MM-DD or null" }, { status: 400 });
    }
    const [y, m, d] = startDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return NextResponse.json({ error: "startDate is not a valid calendar date" }, { status: 400 });
    }
  }
  const normalized = startDate === "" ? null : (startDate ?? null);

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const batch = await prisma.stabilityBatch.upsert({
    where: { productId_batchType: { productId, batchType } },
    update: { startDate: normalized },
    create: { productId, batchType, startDate: normalized },
  });

  return NextResponse.json(batch);
}
