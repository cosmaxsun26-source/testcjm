import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProductDetail from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <ProductDetail product={null} />
        </main>
      </>
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: { steps: { include: { files: true } } },
  });

  if (!product) notFound();

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <ProductDetail product={product} />
      </main>
    </>
  );
}
