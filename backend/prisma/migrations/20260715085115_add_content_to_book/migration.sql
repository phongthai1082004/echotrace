/*
  Warnings:

  - You are about to drop the `BookPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SampleBookPage` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN "content" TEXT;

-- AlterTable
ALTER TABLE "SampleBook" ADD COLUMN "content" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BookPage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SampleBookPage";
PRAGMA foreign_keys=on;
