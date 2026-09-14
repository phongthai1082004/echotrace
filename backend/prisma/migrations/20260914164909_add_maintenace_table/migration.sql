-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstUtmCampaign" TEXT,
ADD COLUMN     "firstUtmMedium" TEXT,
ADD COLUMN     "firstUtmSource" TEXT;

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" SERIAL NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedBy" INTEGER,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceWindow_status_idx" ON "MaintenanceWindow"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_scope_idx" ON "Notification"("userId", "scope");

-- CreateIndex
CREATE INDEX "Order_utmSource_idx" ON "Order"("utmSource");
