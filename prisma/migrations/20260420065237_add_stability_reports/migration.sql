-- CreateTable
CREATE TABLE "StabilityReport" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchType" TEXT NOT NULL,
    "timepoint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StabilityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StabilityFile" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StabilityFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StabilityReport_productId_idx" ON "StabilityReport"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StabilityReport_productId_batchType_timepoint_key" ON "StabilityReport"("productId", "batchType", "timepoint");

-- AddForeignKey
ALTER TABLE "StabilityReport" ADD CONSTRAINT "StabilityReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StabilityFile" ADD CONSTRAINT "StabilityFile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "StabilityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
