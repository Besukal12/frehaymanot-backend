-- CreateTable
CREATE TABLE "CourseCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageStorageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);

-- Preserve existing courses while introducing the required relation.
INSERT INTO "CourseCategory" ("name", "description", "updatedAt")
VALUES ('Uncategorized', 'Courses created before categories were added', CURRENT_TIMESTAMP);

ALTER TABLE "Course" ADD COLUMN "categoryId" INTEGER;

UPDATE "Course"
SET "categoryId" = (SELECT "id" FROM "CourseCategory" WHERE "name" = 'Uncategorized' LIMIT 1)
WHERE "categoryId" IS NULL;

ALTER TABLE "Course" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;