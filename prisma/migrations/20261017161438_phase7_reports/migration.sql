-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "refNumber" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileBytes" BLOB NOT NULL,
    "optionsJson" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "workWeekHours" INTEGER NOT NULL DEFAULT 44,
    "restDay" INTEGER NOT NULL DEFAULT 5,
    "monthlyHoursDivisor" INTEGER NOT NULL DEFAULT 191,
    "overtimeCapAnnual" INTEGER,
    "showWagesToSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "dualApprovalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showEmployerShareToEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CompanySettings" ("companyId", "createdAt", "dualApprovalEnabled", "id", "monthlyHoursDivisor", "overtimeCapAnnual", "restDay", "showWagesToSupervisor", "updatedAt", "workWeekHours") SELECT "companyId", "createdAt", "dualApprovalEnabled", "id", "monthlyHoursDivisor", "overtimeCapAnnual", "restDay", "showWagesToSupervisor", "updatedAt", "workWeekHours" FROM "CompanySettings";
DROP TABLE "CompanySettings";
ALTER TABLE "new_CompanySettings" RENAME TO "CompanySettings";
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GeneratedDocument_companyId_createdAt_idx" ON "GeneratedDocument"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_targetId_idx" ON "GeneratedDocument"("targetId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_subjectUserId_idx" ON "GeneratedDocument"("subjectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_companyId_kind_targetId_format_language_version_key" ON "GeneratedDocument"("companyId", "kind", "targetId", "format", "language", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_companyId_refNumber_key" ON "GeneratedDocument"("companyId", "refNumber");

