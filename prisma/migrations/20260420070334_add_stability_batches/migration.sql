-- CreateTable
CREATE TABLE "StabilityBatch" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchType" TEXT NOT NULL,
    "startDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StabilityBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StabilityBatch_productId_batchType_key" ON "StabilityBatch"("productId", "batchType");

-- AddForeignKey
ALTER TABLE "StabilityBatch" ADD CONSTRAINT "StabilityBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
