/*
  Warnings:

  - You are about to drop the column `categories` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "categories",
ADD COLUMN     "currentPlayers" INTEGER,
ADD COLUMN     "peak24h" INTEGER,
ADD COLUMN     "reviewScore" INTEGER,
ADD COLUMN     "reviewSummary" TEXT;
