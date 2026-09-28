CREATE TYPE "AnnouncementAudience" AS ENUM ('YOUTH', 'CENTRAL', 'CHILDREN', 'EVERYONE');

ALTER TABLE "Announcement"
ADD COLUMN "audience" "AnnouncementAudience" NOT NULL DEFAULT 'EVERYONE';