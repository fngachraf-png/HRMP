-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN "cin" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "cnssNumber" TEXT;

-- CreateTable
CREATE TABLE "PayRegime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bundle" TEXT NOT NULL DEFAULT 'general',
    "bundleStatus" TEXT NOT NULL DEFAULT 'incomplete',
    "minWageType" TEXT NOT NULL DEFAULT 'hourly',
    "minWageCents" INTEGER NOT NULL,
    "dailyHours" INTEGER NOT NULL DEFAULT 8,
    "weeklyHours" INTEGER NOT NULL DEFAULT 44,
    "annualHours" INTEGER,
    "nightStart" TEXT NOT NULL DEFAULT '21:00',
    "nightEnd" TEXT NOT NULL DEFAULT '06:00',
    "monthlyDaysBasis" INTEGER NOT NULL DEFAULT 26,
    "declarationProfile" TEXT NOT NULL DEFAULT 'cnss_ebds',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL,
    "source" TEXT,
    "needsAccountantConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayRegime_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegimeContributionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regimeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rateBp" INTEGER NOT NULL,
    "amountCents" INTEGER,
    "ceilingCents" INTEGER,
    "basis" TEXT NOT NULL DEFAULT 'cnss_base',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    CONSTRAINT "RegimeContributionItem_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "PayRegime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegimeCalcStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regimeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "paramsJson" TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RegimeCalcStep_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "PayRegime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegimeAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "regimeId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegimeAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegimeAssignment_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "PayRegime" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeclarationSpec" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "authority" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "sourceRef" TEXT,
    "layoutJson" TEXT,
    "xsdContent" TEXT,
    "mappingJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeclarationSpec_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Declaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "periodId" TEXT,
    "periodKey" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summaryJson" TEXT,
    "validationJson" TEXT,
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "exportedBy" TEXT,
    "exportedAt" DATETIME,
    "filedAt" DATETIME,
    "filedRef" TEXT,
    "correctsWith" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Declaration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Declaration_specId_fkey" FOREIGN KEY ("specId") REFERENCES "DeclarationSpec" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeclarationFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "specVersion" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeclarationFile_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "Declaration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeclarationReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationId" TEXT NOT NULL,
    "filedAt" DATETIME NOT NULL,
    "filedRef" TEXT,
    "receiptB64" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeclarationReceipt_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "Declaration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PayRegime_companyId_isActive_idx" ON "PayRegime"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "PayRegime_bundle_bundleStatus_idx" ON "PayRegime"("bundle", "bundleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PayRegime_companyId_key_version_key" ON "PayRegime"("companyId", "key", "version");

-- CreateIndex
CREATE INDEX "RegimeContributionItem_regimeId_order_idx" ON "RegimeContributionItem"("regimeId", "order");

-- CreateIndex
CREATE INDEX "RegimeCalcStep_regimeId_order_idx" ON "RegimeCalcStep"("regimeId", "order");

-- CreateIndex
CREATE INDEX "RegimeAssignment_companyId_workerUserId_idx" ON "RegimeAssignment"("companyId", "workerUserId");

-- CreateIndex
CREATE INDEX "RegimeAssignment_regimeId_idx" ON "RegimeAssignment"("regimeId");

-- CreateIndex
CREATE INDEX "DeclarationSpec_authority_kind_status_idx" ON "DeclarationSpec"("authority", "kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeclarationSpec_companyId_authority_kind_version_key" ON "DeclarationSpec"("companyId", "authority", "kind", "version");

-- CreateIndex
CREATE INDEX "Declaration_companyId_authority_kind_periodKey_idx" ON "Declaration"("companyId", "authority", "kind", "periodKey");

-- CreateIndex
CREATE INDEX "Declaration_companyId_status_idx" ON "Declaration"("companyId", "status");

-- CreateIndex
CREATE INDEX "DeclarationFile_declarationId_idx" ON "DeclarationFile"("declarationId");

-- CreateIndex
CREATE INDEX "DeclarationReceipt_declarationId_idx" ON "DeclarationReceipt"("declarationId");

