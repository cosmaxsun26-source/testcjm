import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import StabilityGrid from "@/components/StabilityGrid";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function StabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [session, product] = await Promise.all([
    auth(),
    prisma.product.findUnique({
      where: { id },
      include: {
        stabilityReports: {
          include: { files: { orderBy: { uploadedAt: "asc" } } },
          orderBy: [{ batchType: "asc" }, { timepoint: "asc" }],
        },
        stabilityBatches: {
          orderBy: { batchType: "asc" },
        },
      },
    }),
  ]);
  if (!product) notFound();

  const canEdit = session?.user?.role === "editor" || session?.user?.role === "admin";

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <Link href="/stability" className="text-xs text-gray-500 hover:text-gray-700">
              &larr; Drug Stability 목록
            </Link>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{product.productName}</h1>
            <p className="text-xs text-gray-500">
              {product.customer ? `${product.customer} · ` : ""}
              {product.formulator ? `${product.formulator} · ` : ""}
              NO {product.no ?? "-"}
            </p>
          </div>
          <Link
            href={`/products/${product.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            제품 상세 →
          </Link>
        </div>

        <StabilityGrid
          productId={product.id}
          initialReports={product.stabilityReports}
          initialBatches={product.stabilityBatches}
          canEdit={canEdit}
        />
      </main>
    </>
  );
}
