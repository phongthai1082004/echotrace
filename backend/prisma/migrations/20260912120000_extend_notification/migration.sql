-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "channels" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Notification" ADD COLUMN "email" TEXT;
ALTER TABLE "Notification" ADD COLUMN "phone" TEXT;
ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;
