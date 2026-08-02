/*
  Warnings:

  - You are about to drop the column `cvUrl` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "cvUrl",
ADD COLUMN     "cvDocumentUrl" TEXT,
ADD COLUMN     "portfolioUrl" TEXT;
