import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import {
  uploadToCloudinary,
  validateFileType,
} from "../../middleware/uploadToCloudinary.js";
import { MezmurSchema } from "./mezmur.schema.js";
import { parsePositiveInt } from "../../lib/ids.js";

const publicMezmurSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  thumbnailUrl: true,
  mezmurPoem: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

async function destroyThumbnail(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error(`Failed to clean up Cloudinary thumbnail ${publicId}`, error);
  }
}

function getThumbnail(req: Request) {
  const files = (req.files ?? {}) as {
    thumbnail?: Express.Multer.File[];
  };

  return files.thumbnail?.[0];
}

export async function addMezmur(req: Request, res: Response) {
  let uploadedThumbnailId: string | undefined;

  try {
    const { userId } = getAuth(req);
    const parsed = MezmurSchema.safeParse(req.body);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid mezmur data",
        errors: parsed.error.flatten(),
      });
    }

    const thumbnail = getThumbnail(req);

    if (!thumbnail) {
      return res.status(400).json({
        message: "Thumbnail is required",
      });
    }

    const thumbnailType = await validateFileType(thumbnail.buffer);

    if (!thumbnailType.startsWith("image/")) {
      return res.status(400).json({
        message: "Thumbnail must be an image",
      });
    }

    const uploadedThumbnail = await uploadToCloudinary(
      thumbnail.buffer,
      thumbnailType,
      { filename: thumbnail.originalname },
    );
    uploadedThumbnailId = uploadedThumbnail.public_id;

    const mezmur = await prisma.mezmur.create({
      data: {
        ...parsed.data,
        thumbnailUrl: uploadedThumbnail.secure_url,
        thumbnailStorageId: uploadedThumbnail.public_id,
        uploadedBy: userId,
      },
      select: publicMezmurSelect,
    });

    return res.status(201).json({
      message: "Mezmur created successfully",
      mezmur,
    });
  } catch (error) {
    if (uploadedThumbnailId) {
      await destroyThumbnail(uploadedThumbnailId);
    }

    console.error("Add mezmur error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMezmurs(_req: Request, res: Response) {
  try {
    const mezmurs = await prisma.mezmur.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: publicMezmurSelect,
    });

    return res.status(200).json({
      message: "Mezmurs retrieved successfully",
      mezmurs,
    });
  } catch (error) {
    console.error("Get mezmurs error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMezmurById(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid mezmur ID" });
    }

    const mezmur = await prisma.mezmur.findUnique({
      where: { id },
      select: publicMezmurSelect,
    });

    if (!mezmur) {
      return res.status(404).json({ message: "Mezmur not found" });
    }

    return res.status(200).json({
      message: "Mezmur retrieved successfully",
      mezmur,
    });
  } catch (error) {
    console.error("Get mezmur by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateMezmur(req: Request, res: Response) {
  let uploadedThumbnailId: string | undefined;

  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid mezmur ID" });
    }

    const existing = await prisma.mezmur.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Mezmur not found" });
    }

    const parsed = MezmurSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid mezmur data",
        errors: parsed.error.flatten(),
      });
    }

    const thumbnail = getThumbnail(req);
    let thumbnailData: {
      thumbnailUrl?: string;
      thumbnailStorageId?: string;
    } = {};

    if (thumbnail) {
      const thumbnailType = await validateFileType(thumbnail.buffer);

      if (!thumbnailType.startsWith("image/")) {
        return res.status(400).json({ message: "Thumbnail must be an image" });
      }

      const uploadedThumbnail = await uploadToCloudinary(
        thumbnail.buffer,
        thumbnailType,
        { filename: thumbnail.originalname },
      );
      uploadedThumbnailId = uploadedThumbnail.public_id;
      thumbnailData = {
        thumbnailUrl: uploadedThumbnail.secure_url,
        thumbnailStorageId: uploadedThumbnail.public_id,
      };
    }

    const mezmur = await prisma.mezmur.update({
      where: { id },
      data: { ...parsed.data, ...thumbnailData },
      select: publicMezmurSelect,
    });

    if (thumbnailData.thumbnailStorageId && existing.thumbnailStorageId) {
      await destroyThumbnail(existing.thumbnailStorageId);
    }

    return res.status(200).json({
      message: "Mezmur updated successfully",
      mezmur,
    });
  } catch (error) {
    if (uploadedThumbnailId) {
      await destroyThumbnail(uploadedThumbnailId);
    }

    console.error("Update mezmur error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMezmur(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid mezmur ID" });
    }

    const mezmur = await prisma.mezmur.findUnique({ where: { id } });

    if (!mezmur) {
      return res.status(404).json({ message: "Mezmur not found" });
    }

    await prisma.mezmur.delete({ where: { id } });

    if (mezmur.thumbnailStorageId) {
      await destroyThumbnail(mezmur.thumbnailStorageId);
    }

    return res.status(200).json({
      message: "Mezmur deleted successfully",
      mezmur,
    });
  } catch (error) {
    console.error("Delete mezmur error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
