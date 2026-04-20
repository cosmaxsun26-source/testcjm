-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('viewer', 'editor', 'admin');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "no" INTEGER,
    "category" TEXT NOT NULL,
    "customer" TEXT,
    "productName" TEXT NOT NULL,
    "labNumber" TEXT,
    "bulkCode" TEXT,
    "bulkCodeName" TEXT,
    "productType" TEXT,
    "uvFilterType" TEXT,
    "formulation" TEXT,
    "spf" TEXT,
    "broadSpectrum" TEXT,
    "waterResistant" TEXT,
    "container" TEXT,
    "volume" TEXT,
    "devTeam" TEXT,
    "formulator" TEXT,
    "salesManager" TEXT,
    "devNote" TEXT,
    "targetDate" TEXT,
    "devStatus" TEXT,
    "formulationConfirmed" TEXT,
    "activeIngredients" TEXT,
    "clinicalTrial" TEXT,
    "uniiCode" TEXT,
    "preservative" TEXT,
    "labBatchCT" TEXT,
    "tmvTmt" TEXT,
    "rawMaterialQual" TEXT,
    "trialMfg" TEXT,
    "trialMfgDate" TEXT,
    "bulkShelfLife" TEXT,
    "bulkShelfLifeDate" TEXT,
    "fillingPackaging" TEXT,
    "labStability" TEXT,
    "drugStability" TEXT,
    "productReg" TEXT,
    "importReg" TEXT,
    "production" TEXT,
    "validation" TEXT,
    "drugStability2" TEXT,
    "shipment" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "dueDate" TEXT,
    "completedDate" TEXT,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepFile" (
    "id" SERIAL NOT NULL,
    "stepId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepHistory" (
    "id" SERIAL NOT NULL,
    "stepId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "StepHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStep_productId_stepKey_key" ON "ProcessStep"("productId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StepHistory_productId_changedAt_idx" ON "StepHistory"("productId", "changedAt");

-- CreateIndex
CREATE INDEX "StepHistory_stepId_changedAt_idx" ON "StepHistory"("stepId", "changedAt");

-- CreateIndex
CREATE INDEX "StepHistory_changedByUserId_idx" ON "StepHistory"("changedByUserId");

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepFile" ADD CONSTRAINT "StepFile_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcessStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepHistory" ADD CONSTRAINT "StepHistory_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProcessStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepHistory" ADD CONSTRAINT "StepHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepHistory" ADD CONSTRAINT "StepHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
