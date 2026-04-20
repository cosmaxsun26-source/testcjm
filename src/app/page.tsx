import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ProductList from "@/components/ProductList";
import { STABILITY_BATCH_TYPES, STABILITY_TIMEPOINTS } from "@/lib/constants";
import { hasRedStability } from "@/lib/stability-dates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await prisma.product.findMany({
    include: {
      steps: { include: { files: true } },
      stabilityReports: { select: { batchType: true, timepoint: true, status: true } },
      stabilityBatches: { select: { batchType: true, startDate: true } },
    },
    orderBy: { no: "asc" },
  });

  const now = new Date();
  const withRed = products.map((p) => ({
    ...p,
    hasRedStability: hasRedStability(
      p.stabilityReports,
      p.stabilityBatches,
      STABILITY_BATCH_TYPES,
      STABILITY_TIMEPOINTS,
      now,
    ),
  }));

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ProductList initialProducts={withRed} />
      </main>
    </>
  );
}
