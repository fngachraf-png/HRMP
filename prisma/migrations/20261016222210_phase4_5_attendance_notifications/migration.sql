-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "workerUserId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "shiftId" TEXT,
    "type" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "accuracyM" REAL,
    "distanceM" REAL,
    "insideFence" BOOLEAN NOT NULL,
    "policy" TEXT NOT NULL DEFAULT 'none',
    "verification" TEXT NOT NULL DEFAULT 'none',
    "qrNonce" TEXT,
    "status" TEXT NOT NULL DEFAULT 'verified',
    "reason" TEXT,
    "deviceJson" TEXT,
    "spoofJson" TEXT,
    "networkMode" TEXT NOT NULL DEFAULT 'internet',
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceEvent_workerUserId_fkey" FOREIGN KEY ("workerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvent_qrNonce_key" ON "AttendanceEvent"("qrNonce");

-- CreateIndex
CREATE INDEX "AttendanceEvent_companyId_workerUserId_occurredAt_idx" ON "AttendanceEvent"("companyId", "workerUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_companyId_siteId_occurredAt_idx" ON "AttendanceEvent"("companyId", "siteId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_companyId_status_occurredAt_idx" ON "AttendanceEvent"("companyId", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_type_occurredAt_idx" ON "AttendanceEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "Notification_companyId_userId_createdAt_idx" ON "Notification"("companyId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Device_endpoint_key" ON "Device"("endpoint");

-- CreateIndex
CREATE INDEX "Device_userId_isActive_idx" ON "Device"("userId", "isActive");

