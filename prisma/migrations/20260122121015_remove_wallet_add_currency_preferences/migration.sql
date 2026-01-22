/*
  Warnings:

  - You are about to drop the column `totalBudget` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `wallet` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "budgetDenomination" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "totalBudget",
DROP COLUMN "wallet",
ADD COLUMN     "preferredCurrency" TEXT NOT NULL DEFAULT 'USD';
