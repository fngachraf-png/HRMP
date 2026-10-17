
-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holiday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "hourlyRateCents" INTEGER,
    "dailyRateCents" INTEGER,
    "monthlyCents" INTEGER,
    "transportZone" TEXT NOT NULL DEFAULT 'urban',
    "dependentsCount" INTEGER NOT NULL DEFAULT 0,
    "hireDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generatedAt" DATETIME,
    "submittedAt" DATETIME,
    "submittedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "refNumber" TEXT NOT NULL,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedDays" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "sbiCents" INTEGER NOT NULL DEFAULT 0,
    "cnssBaseCents" INTEGER NOT NULL DEFAULT 0,
    "cnssEmployeeCents" INTEGER NOT NULL DEFAULT 0,
    "amoEmployeeCents" INTEGER NOT NULL DEFAULT 0,
    "proDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "rniCents" INTEGER NOT NULL DEFAULT 0,
    "irGrossCents" INTEGER NOT NULL DEFAULT 0,
    "familyDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "irNetCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "employerCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "smigBreached" BOOLEAN NOT NULL DEFAULT false,
    "warningsJson" TEXT,
    "rulesJson" TEXT,
    "dailyJson" TEXT,
    "snapshotJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payslip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payslip_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payslip_workerUserId_fkey" FOREIGN KEY ("workerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayslipLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payslipId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "minutes" INTEGER,
    "rateBp" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "exemptIrCents" INTEGER NOT NULL DEFAULT 0,
    "exemptCnssCents" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayslipLine_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "payslipId" TEXT,
    "periodId" TEXT,
    "workerUserId" TEXT,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "refNumber" TEXT,
    "entryJson" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Holiday_companyId_localDate_idx" ON "Holiday"("companyId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_companyId_localDate_key" ON "Holiday"("companyId", "localDate");

-- CreateIndex
CREATE INDEX "EmployeeProfile_companyId_status_idx" ON "EmployeeProfile"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_companyId_userId_key" ON "EmployeeProfile"("companyId", "userId");

-- CreateIndex
CREATE INDEX "PayPeriod_companyId_status_idx" ON "PayPeriod"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayPeriod_companyId_year_month_key" ON "PayPeriod"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "Payslip_companyId_workerUserId_idx" ON "Payslip"("companyId", "workerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_periodId_workerUserId_key" ON "Payslip"("periodId", "workerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_companyId_refNumber_key" ON "Payslip"("companyId", "refNumber");

-- CreateIndex
CREATE INDEX "PayslipLine_payslipId_order_idx" ON "PayslipLine"("payslipId", "order");

-- CreateIndex
CREATE INDEX "LedgerEntry_companyId_createdAt_idx" ON "LedgerEntry"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_payslipId_idx" ON "LedgerEntry"("payslipId");

