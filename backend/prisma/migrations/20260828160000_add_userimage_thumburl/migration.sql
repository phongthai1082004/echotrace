-- Add thumbUrl column to UserImage for Worker-generated thumbnails
ALTER TABLE "UserImage" ADD COLUMN "thumbUrl" TEXT;
