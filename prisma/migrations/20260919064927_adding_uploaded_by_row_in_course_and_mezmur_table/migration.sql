-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "uploadedBy" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "uploadedBy" TEXT;

-- AlterTable
ALTER TABLE "Mezmur" ADD COLUMN "uploadedBy" TEXT;

-- Backfill existing rows before enforcing the required columns.
UPDATE "Announcement" SET "uploadedBy" = "uploadedById";
UPDATE "Course" SET "uploadedBy" = 'legacy';
UPDATE "Mezmur" SET "uploadedBy" = 'legacy';

-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "uploadedBy" SET NOT NULL;
ALTER TABLE "Course" ALTER COLUMN "uploadedBy" SET NOT NULL;
ALTER TABLE "Mezmur" ALTER COLUMN "uploadedBy" SET NOT NULL;
