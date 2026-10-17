-- CreateTable
CREATE TABLE "OwnershipTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL DEFAULT 'awaiting_current_owner',
    "reason" TEXT,
    "newOwnerLegalName" TEXT NOT NULL,
    "newOwnerDisplayName" TEXT NOT NULL,
    "newOwnerContactEmail" TEXT,
    "newOwnerContactPhone" TEXT,
    "newOwnerInitialAdminEmail" TEXT NOT NULL,
    "oldOwnerJson" TEXT,
    "initiatedByUserId" TEXT NOT NULL,
    "currentOwnerApprovedAt" DATETIME,
    "currentOwnerApprovedBy" TEXT,
    "newOwnerApprovedAt" DATETIME,
    "newOwnerApprovedByUserId" TEXT,
    "approvalCodeHash" TEXT,
    "backupPath" TEXT,
    "backupSha256" TEXT,
    "backupTableCount" INTEGER,
    "exportPath" TEXT,
    "exportSha256" TEXT,
    "integrityCheckStatus" TEXT,
    "integrityCheckDetail" TEXT,
    "executedAt" DATETIME,
    "executedByUserId" TEXT,
    "newAdminUserId" TEXT,
    "revokedSuperAdminCount" INTEGER,
    "sessionsInvalidatedUsers" INTEGER,
    "secretsRotatedAt" DATETIME,
    "secretsRotatedByUserId" TEXT,
    "cancelledAt" DATETIME,
    "cancelledByUserId" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformOwner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'ar',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "websiteUrl" TEXT,
    "termsUrl" TEXT,
    "footerText" TEXT,
    "modulesJson" TEXT,
    "transferFreeze" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlatformOwner" ("contactEmail", "contactPhone", "createdAt", "defaultCurrency", "defaultLocale", "displayName", "id", "legalName", "logoUrl", "updatedAt") SELECT "contactEmail", "contactPhone", "createdAt", "defaultCurrency", "defaultLocale", "displayName", "id", "legalName", "logoUrl", "updatedAt" FROM "PlatformOwner";
DROP TABLE "PlatformOwner";
ALTER TABLE "new_PlatformOwner" RENAME TO "PlatformOwner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OwnershipTransfer_state_idx" ON "OwnershipTransfer"("state");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_createdAt_idx" ON "OwnershipTransfer"("createdAt");

