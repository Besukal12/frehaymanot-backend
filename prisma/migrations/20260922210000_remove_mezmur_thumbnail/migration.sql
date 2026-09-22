-- Remove mezmur-specific image storage; images now come from the category.
ALTER TABLE "Mezmur" DROP COLUMN IF EXISTS "thumbnailUrl";
ALTER TABLE "Mezmur" DROP COLUMN IF EXISTS "thumbnailStorageId";