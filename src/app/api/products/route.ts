import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_STEPS } from "@/lib/constants";
import { requireSession, requireEditor } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const devTeam = searchParams.get("devTeam");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (devTeam) where.devTeam = devTeam;
  if (search) {
    where.OR = [
      { productName: { contains: search } },
      { customer: { contains: search } },
      { labNumber: { contains: search } },
      { formulator: { contains: search } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: { steps: { include: { files: true } } },
    orderBy: { no: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const { error } = await requireEditor();
  if (error) return error;

  const body = await request.json();

  const product = await prisma.product.create({
    data: {
      ...body,
      steps: {
        create: ALL_STEPS.map((step) => ({
          stepKey: step.key,
          status: "pending",
        })),
      },
    },
    include: { steps: true },
  });

  return NextResponse.json(product, { status: 201 });
}
