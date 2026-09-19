import { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { getAuth } from "@clerk/express";
import {
  validateFileType,
  uploadToCloudinary,
} from "../../middleware/uploadToCloudinary.js";
import cloudinary from "../../config/cloudinary.js";
import { CourseCategorySchema, CourseSchema } from "./course.schema.js";
import { isAdminRole } from "../../middleware/auth.middleware.js";
import { parsePositiveInt } from "../../lib/ids.js";

export async function addCourse(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const courseData = CourseSchema.safeParse(req.body);

    if (!courseData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: courseData.error.flatten(),
      });
    }

    const { title, description, grade, categoryId } = courseData.data;

    const files = (req.files ?? {}) as {
      thumbnail?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    };

    const thumbnail = files.thumbnail?.[0];
    const pdf = files.pdf?.[0];

    if (!thumbnail || !pdf) {
      return res.status(400).json({
        message: "Thumbnail and PDF are required",
      });
    }

    const thumbnailType = await validateFileType(thumbnail.buffer);
    const pdfType = await validateFileType(pdf.buffer);

    if (!thumbnailType.startsWith("image/")) {
      return res.status(400).json({
        message: "Thumbnail must be an image",
      });
    }

    if (pdfType !== "application/pdf") {
      return res.status(400).json({
        message: "File must be a PDF",
      });
    }

    const uploadedThumbnail = await uploadToCloudinary(
      thumbnail.buffer,
      thumbnailType,
      { filename: thumbnail.originalname },
    );

    const uploadedPdf = await uploadToCloudinary(pdf.buffer, pdfType, {
      filename: pdf.originalname,
    });

    const newCourse = await prisma.course.create({
      data: {
        title: title,
        description: description,
        grade: grade,
        categoryId: categoryId,

        thumbnailUrl: uploadedThumbnail.secure_url,
        thumbnailStorageId: uploadedThumbnail.public_id,

        pdfUrl: uploadedPdf.secure_url,
        pdfStorageId: uploadedPdf.public_id,

        uploadedBy: userId,
      },
    });

    return res.status(201).json({
      message: "Course created successfully",
      course: newCourse,
    });
  } catch (error) {
    console.error("Add course error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getCourse(req: Request, res: Response) {
  try {
    const course = await prisma.course.findMany();

    return res.status(200).json({
      message: "Courses retrieved successfully",
      courses: course,
    });
  } catch (error) {
    console.error("Get course error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getCourseById(req: Request, res: Response) {
  try {
    const courseId = parsePositiveInt(req.params.id);

    if (!courseId) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    return res.status(200).json({
      message: "Course retrieved successfully",
      course: course,
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function deleteCourse(req: Request, res: Response) {
  try {
    const { userId, orgRole } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(404).json({
        message: "Invalid course ID",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const isOwner = course.uploadedBy === userId;
    const isAdmin = isAdminRole(orgRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You are not authorized to delete this course.",
      });
    }

    if (course.thumbnailStorageId) {
      await cloudinary.uploader.destroy(course.thumbnailStorageId, {
        resource_type: "image",
      });
    }

    if (course.pdfStorageId) {
      await cloudinary.uploader.destroy(course.pdfStorageId, {
        resource_type: "raw",
      });
    }

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    return res.status(200).json({
      message: "Course deleted successfully",
      course,
    });
  } catch (error) {
    console.error("Delete course error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function updateCourse(req: Request, res: Response) {
  try {
    const { userId, orgRole } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(404).json({
        message: "Invalid course ID",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const isOwner = course.uploadedBy === userId;
    const isAdmin = isAdminRole(orgRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You are not authorized to update this course.",
      });
    }

    const safeData = CourseSchema.partial().safeParse(req.body);

    if (!safeData.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: safeData.error.flatten(),
      });
    }

    const { title, description, grade } = safeData.data;

    const files = (req.files ?? {}) as {
      thumbnail?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    };

    const thumbnail = files.thumbnail?.[0];
    const pdf = files.pdf?.[0];

    const updateData: Record<string, unknown> = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(grade !== undefined && { grade }),
    };

    let oldThumbnailStorageId: string | null = null;
    let oldPdfStorageId: string | null = null;

    if (thumbnail) {
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

      updateData.thumbnailUrl = uploadedThumbnail.secure_url;
      updateData.thumbnailStorageId = uploadedThumbnail.public_id;
      oldThumbnailStorageId = course.thumbnailStorageId;
    }

    if (pdf) {
      const pdfType = await validateFileType(pdf.buffer);

      if (pdfType !== "application/pdf") {
        return res.status(400).json({
          message: "File must be a PDF",
        });
      }

      const uploadedPdf = await uploadToCloudinary(pdf.buffer, pdfType, {
        filename: pdf.originalname,
      });

      updateData.pdfUrl = uploadedPdf.secure_url;
      updateData.pdfStorageId = uploadedPdf.public_id;
      oldPdfStorageId = course.pdfStorageId;
    }

    const updatedCourse = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: updateData,
    });

    // Clean up old files only after the DB write succeeds
    if (oldThumbnailStorageId) {
      await cloudinary.uploader.destroy(oldThumbnailStorageId, {
        resource_type: "image",
      });
    }

    if (oldPdfStorageId) {
      await cloudinary.uploader.destroy(oldPdfStorageId, {
        resource_type: "raw",
      });
    }

    return res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse,
    });
  } catch (error) {
    console.error("Update Course error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
