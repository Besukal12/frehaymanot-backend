import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import {
  validateFileType,
  uploadToCloudinary,
} from "../../middleware/uploadToCloudinary.js";
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from "./announcement.schema.js";
import { isAdminRole } from "../../middleware/auth.middleware.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const publicAnnouncementSelect = {
  id: true,
  title: true,
  slug: true,
  content: true,
  thumbnailUrl: true,
  postedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function generateSlug(title: string): string | null {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || null;
}

function parsePositiveQueryInteger(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function destroyThumbnail(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to clean up Cloudinary thumbnail ${publicId}`, error);
  }
}

export async function addAnnouncement(req: Request, res: Response) {
  let uploadedThumbnailId: string | undefined;

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const result = CreateAnnouncementSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid announcement data",
        errors: result.error.flatten(),
      });
    }

    const { title, content, postedAt, slug: providedSlug } = result.data;

    const slug = providedSlug ?? generateSlug(title);

    if (!slug) {
      return res.status(400).json({
        message: "Title must contain at least one letter or number",
      });
    }

    const files = req.files as
      | { thumbnail?: Express.Multer.File[] }
      | undefined;

    let thumbnailUrl: string | undefined;
    let thumbnailStorageId: string | undefined;

    const thumbnail = files?.thumbnail?.[0];

    if (thumbnail) {
      const isValid = await validateFileType(thumbnail.buffer);

      if (!isValid.startsWith("image/")) {
        return res.status(400).json({
          message: "Invalid thumbnail file",
        });
      }

      const uploaded = await uploadToCloudinary(thumbnail.buffer, isValid);

      thumbnailUrl = uploaded.secure_url;
      thumbnailStorageId = uploaded.public_id;
      uploadedThumbnailId = uploaded.public_id;
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        slug,
        content,
        postedAt: postedAt ?? new Date(),
        thumbnailUrl,
        thumbnailStorageId,
        uploadedById: userId,
      },
    });

    return res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    if (uploadedThumbnailId) {
      await destroyThumbnail(uploadedThumbnailId);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "An announcement with this slug already exists",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to create announcement",
    });
  }
}

export async function getAnnouncements(req: Request, res: Response) {
  try {
    const page =
      req.query.page === undefined
        ? 1
        : parsePositiveQueryInteger(req.query.page);
    const pageSize =
      req.query.pageSize === undefined
        ? DEFAULT_PAGE_SIZE
        : parsePositiveQueryInteger(req.query.pageSize);

    if (page === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
      return res.status(400).json({
        message: `page must be a positive integer and pageSize must be between 1 and ${MAX_PAGE_SIZE}`,
      });
    }

    const skip = (page - 1) * pageSize;

    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        message: "page is too large",
      });
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: [{ postedAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: publicAnnouncementSelect,
    });

    return res.status(200).json({
      announcements,
      pagination: {
        page,
        pageSize,
        hasMore: announcements.length === pageSize,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get announcements",
    });
  }
}

export async function getAnnouncementById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid announcement ID",
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: publicAnnouncementSelect,
    });

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      announcement,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to get announcement",
    });
  }
}

export async function updateAnnouncement(req: Request, res: Response) {
  let newThumbnailId: string | undefined;

  try {
    const { userId, orgRole } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid announcement ID",
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    if (announcement.uploadedById !== userId && !isAdminRole(orgRole)) {
      return res.status(403).json({
        message: "You are not allowed to update this announcement",
      });
    }

    const result = UpdateAnnouncementSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid announcement data",
        errors: result.error.flatten(),
      });
    }

    const { title, slug, content, postedAt } = result.data;

    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      postedAt?: Date;
      thumbnailUrl?: string;
      thumbnailStorageId?: string;
    } = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (slug !== undefined) {
      updateData.slug = slug;
    } else if (title !== undefined) {
      const generatedSlug = generateSlug(title);

      if (!generatedSlug) {
        return res.status(400).json({
          message: "Title must contain at least one letter or number",
        });
      }

      updateData.slug = generatedSlug;
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    if (postedAt !== undefined) {
      updateData.postedAt = postedAt;
    }

    const files = req.files as
      | { thumbnail?: Express.Multer.File[] }
      | undefined;

    const thumbnail = files?.thumbnail?.[0];

    if (thumbnail) {
      const isValid = await validateFileType(thumbnail.buffer);

      if (!isValid.startsWith("image/")) {
        return res.status(400).json({
          message: "Invalid thumbnail file",
        });
      }

      const uploaded = await uploadToCloudinary(thumbnail.buffer, isValid);

      newThumbnailId = uploaded.public_id;

      updateData.thumbnailUrl = uploaded.secure_url;
      updateData.thumbnailStorageId = uploaded.public_id;
    }

    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    if (newThumbnailId && announcement.thumbnailStorageId) {
      await destroyThumbnail(announcement.thumbnailStorageId);
    }

    return res.status(200).json({
      message: "Announcement updated successfully",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    if (newThumbnailId) {
      await destroyThumbnail(newThumbnailId);
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update announcement",
    });
  }
}

export async function deleteAnnouncement(req: Request, res: Response) {
  try {
    const { userId, orgRole } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid announcement ID",
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    if (announcement.uploadedById !== userId && !isAdminRole(orgRole)) {
      return res.status(403).json({
        message: "You are not allowed to delete this announcement",
      });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    if (announcement.thumbnailStorageId) {
      await destroyThumbnail(announcement.thumbnailStorageId);
    }

    return res.status(200).json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete announcement",
    });
  }
}
