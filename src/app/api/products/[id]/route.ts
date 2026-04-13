import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { steps: true },
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
  const { id } = await params;
  const body = await request.json();
  const { steps, ...productData } = body;

  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: productData,
    include: { steps: true },
  });

  if (steps && Array.isArray(steps)) {
    for (const step of steps) {
      await prisma.processStep.upsert({
        where: {
          productId_stepKey: {
            productId: parseInt(id),
            stepKey: step.stepKey,
          },
        },
        update: {
          status: step.status,
          note: step.note,
          dueDate: step.dueDate,
          completedDate: step.completedDate,
        },
        create: {
          productId: parseInt(id),
          stepKey: step.stepKey,
          status: step.status || "pending",
          note: step.note,
          dueDate: step.dueDate,
          completedDate: step.completedDate,
        },
      });
    }
  }

  const updated = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { steps: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.product.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ success: true });
}
