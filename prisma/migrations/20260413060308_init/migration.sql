-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "shipment" TEXT
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "dueDate" TEXT,
    "completedDate" TEXT,
    CONSTRAINT "ProcessStep_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStep_productId_stepKey_key" ON "ProcessStep"("productId", "stepKey");
