import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireEditor } from "@/lib/auth-helpers";
import { recordStatusChange } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { steps: { include: { files: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireEditor();
  if (error) return error;

  const { id } = await params;
  const productId = parseInt(id);
  const body = await request.json();
  const { steps, ...productData } = body;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: productData,
    });

    if (steps && Array.isArray(steps)) {
      const existing = await tx.processStep.findMany({
        where: { productId },
        select: { stepKey: true, status: true },
      });
      const prevStatusByKey = new Map(existing.map((s) => [s.stepKey, s.status]));

      for (const step of steps) {
        const newStatus = step.status || "pending";
        const upserted = await tx.processStep.upsert({
          where: {
            productId_stepKey: { productId, stepKey: step.stepKey },
          },
          update: {
            status: newStatus,
            note: step.note,
            dueDate: step.dueDate,
            completedDate: step.completedDate,
          },
          create: {
            productId,
            stepKey: step.stepKey,
            status: newStatus,
            note: step.note,
            dueDate: step.dueDate,
            completedDate: step.completedDate,
          },
        });

        const oldStatus = prevStatusByKey.get(step.stepKey) ?? null;
        await recordStatusChange(tx, {
          stepId: upserted.id,
          productId,
          oldStatus,
          newStatus,
          changedByUserId: session.user.id,
        });
      }
    }

    return tx.product.findUnique({
      where: { id: productId },
      include: { steps: { include: { files: true } } },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireEditor();
  if (error) return error;

  const { id } = await params;
  await prisma.product.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ success: true });
}
