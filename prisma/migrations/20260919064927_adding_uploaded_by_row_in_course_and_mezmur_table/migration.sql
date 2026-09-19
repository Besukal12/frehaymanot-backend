/*
  Warnings:

  - Added the required column `uploadedBy` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `Mezmur` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "uploadedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "uploadedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Mezmur" ADD COLUMN     "uploadedBy" TEXT NOT NULL;
