-- Add dedicated i18n column (was stuffed inside metadata)
ALTER TABLE "Notification" ADD COLUMN "i18n" JSONB;

-- Backfill rows written by admin broadcast before the column existed
UPDATE "Notification" SET "i18n" = "metadata"->'i18n' WHERE "metadata"->'i18n' IS NOT NULL AND "i18n" IS NULL;
