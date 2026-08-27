/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Cashflow` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Cashflow` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Income` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Income` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `isDelete` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `IdempotencyKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cashflow" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";

-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Income" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";

-- AlterTable
ALTER TABLE "Token" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "deletedAt",
DROP COLUMN "isDelete";
