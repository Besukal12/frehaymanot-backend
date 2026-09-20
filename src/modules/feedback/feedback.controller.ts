import { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { CreateFeedbackSchema } from "./feedback.schema.js";
import { parsePositiveInt } from "../../lib/ids.js";

export async function addFeedback(req: Request, res: Response) {
  try {
    const parsed = CreateFeedbackSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const feedback = await prisma.feedback.create({
      data: parsed.data,
    });

    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Add feedback error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getFeedback(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort === "asc" ? "asc" : "desc";

    const [feedbacks, total] = await prisma.$transaction([
      prisma.feedback.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: sortParam },
      }),
      prisma.feedback.count(),
    ]);

    return res.status(200).json({
      message: "Feedback retrieved successfully",
      feedbacks,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getFeedbackById(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid feedback ID",
      });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    return res.status(200).json({
      message: "Feedback retrieved successfully",
      feedback,
    });
  } catch (error) {
    console.error("Get feedback by ID error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function deleteFeedback(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid feedback ID",
      });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    await prisma.feedback.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Feedback deleted successfully",
      feedback,
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
