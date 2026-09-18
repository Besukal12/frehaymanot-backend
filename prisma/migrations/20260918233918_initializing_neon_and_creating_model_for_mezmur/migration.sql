-- CreateTable
CREATE TABLE "MezmurCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MezmurCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mezmur" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "thumbnailStorageId" TEXT,
    "mezmurPoem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mezmur_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mezmur" ADD CONSTRAINT "Mezmur_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MezmurCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
