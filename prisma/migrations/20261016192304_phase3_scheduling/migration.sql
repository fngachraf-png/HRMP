-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'other',
    "startTimeMin" INTEGER NOT NULL,
    "endTimeMin" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "templateId" TEXT,
    "recurrenceId" TEXT,
    "localDate" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_workerUserId_fkey" FOREIGN KEY ("workerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "ShiftRecurrence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftRecurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'fixed',
    "templateId" TEXT,
    "rotationJson" TEXT,
    "rotationStepDays" INTEGER NOT NULL DEFAULT 7,
    "weekdaysJson" TEXT,
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftRecurrence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftRecurrence_workerUserId_fkey" FOREIGN KEY ("workerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftRecurrence_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftRecurrence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShiftTemplate_companyId_status_idx" ON "ShiftTemplate"("companyId", "status");

-- CreateIndex
CREATE INDEX "ShiftTemplate_companyId_sector_idx" ON "ShiftTemplate"("companyId", "sector");

-- CreateIndex
CREATE INDEX "Shift_companyId_workerUserId_startsAt_idx" ON "Shift"("companyId", "workerUserId", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_companyId_siteId_startsAt_idx" ON "Shift"("companyId", "siteId", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_companyId_status_startsAt_idx" ON "Shift"("companyId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_recurrenceId_idx" ON "Shift"("recurrenceId");

-- CreateIndex
CREATE INDEX "ShiftRecurrence_companyId_status_idx" ON "ShiftRecurrence"("companyId", "status");

-- CreateIndex
CREATE INDEX "ShiftRecurrence_companyId_workerUserId_idx" ON "ShiftRecurrence"("companyId", "workerUserId");
