import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ProductList from "@/components/ProductList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await prisma.product.findMany({
    include: { steps: true },
    orderBy: { no: "asc" },
  });

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ProductList initialProducts={products} />
      </main>
    </>
  );
}
