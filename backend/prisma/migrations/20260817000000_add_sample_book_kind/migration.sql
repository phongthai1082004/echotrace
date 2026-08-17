-- CreateEnum
CREATE TYPE "SampleBookKind" AS ENUM ('ALBUM', 'TEMPLATE');

-- AlterTable
ALTER TABLE "SampleBook" ADD COLUMN     "kind" "SampleBookKind" DEFAULT 'TEMPLATE';