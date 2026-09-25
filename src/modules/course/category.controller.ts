import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import {
  uploadToCloudinary,
  validateFileType,
} from "../../middleware/uploadToCloudinary.js";
import { parsePositiveInt } from "../../lib/ids.js";
import { CourseCategorySchema } from "./course.schema.js";

const publicCategorySelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { courses: true } },
} as const;

function getCategoryImage(req: Request) {
  const files = (req.files ?? {}) as {
    image?: Express.Multer.File[];
  };

  return files.image?.[0];
}

async function destroyCategoryImage(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error(
      `Failed to clean up course category image ${publicId}`,
      error,
    );
  }
}

export async function getCourseCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.courseCategory.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: publicCategorySelect,
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error("Get course categories error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function addCourseCategory(req: Request, res: Response) {
  let uploadedImageId: string | undefined;

  try {
    const parsed = CourseCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const image = getCategoryImage(req);
    let imageData: { imageUrl?: string; imageStorageId?: string } = {};

    if (image) {
      const imageType = await validateFileType(image.buffer);

      if (!imageType.startsWith("image/")) {
        return res
          .status(400)
          .json({ message: "Category image must be an image" });
      }

      const uploaded = await uploadToCloudinary(image.buffer, imageType, {
        filename: image.originalname,
      });
      uploadedImageId = uploaded.public_id;
      imageData = {
        imageUrl: uploaded.secure_url,
        imageStorageId: uploaded.public_id,
      };
    }

    const category = await prisma.courseCategory.create({
      data: { ...parsed.data, ...imageData },
      select: publicCategorySelect,
    });
    return res.status(201).json({ category });
  } catch (error) {
    if (uploadedImageId) await destroyCategoryImage(uploadedImageId);
    console.error("Add course category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateCourseCategory(req: Request, res: Response) {
  let uploadedImageId: string | undefined;

  try {
    const id = parsePositiveInt(req.params.id);
    const parsed = CourseCategorySchema.partial().safeParse(req.body);

    if (!id) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const existing = await prisma.courseCategory.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    const image = getCategoryImage(req);
    let imageData: { imageUrl?: string; imageStorageId?: string } = {};

    if (image) {
      const imageType = await validateFileType(image.buffer);

      if (!imageType.startsWith("image/")) {
        return res
          .status(400)
          .json({ message: "Category image must be an image" });
      }

      const uploaded = await uploadToCloudinary(image.buffer, imageType, {
        filename: image.originalname,
      });
      uploadedImageId = uploaded.public_id;
      imageData = {
        imageUrl: uploaded.secure_url,
        imageStorageId: uploaded.public_id,
      };
    }

    const category = await prisma.courseCategory.update({
      where: { id },
      data: { ...parsed.data, ...imageData },
      select: publicCategorySelect,
    });

    if (imageData.imageStorageId && existing.imageStorageId) {
      await destroyCategoryImage(existing.imageStorageId);
    }

    return res.status(200).json({ category });
  } catch (error) {
    if (uploadedImageId) await destroyCategoryImage(uploadedImageId);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Category not found" });
    }

    console.error("Update course category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteCourseCategory(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await prisma.courseCategory.delete({ where: { id } });

    if (category.imageStorageId) {
      await destroyCategoryImage(category.imageStorageId);
    }
    return res.status(200).json({ category });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Category not found" });
    }

    console.error("Delete course category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
