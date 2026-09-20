import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { parsePositiveInt } from "../../lib/ids.js";
import { MezmurCategorySchema } from "./mezmur.schema.js";

export async function getMezmurCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.mezmurCategory.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { _count: { select: { mezmurs: true } } },
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error("Get mezmur categories error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function addMezmurCategory(req: Request, res: Response) {
  try {
    const parsed = MezmurCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const category = await prisma.mezmurCategory.create({ data: parsed.data });
    return res.status(201).json({ category });
  } catch (error) {
    console.error("Add mezmur category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateMezmurCategory(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);
    const parsed = MezmurCategorySchema.partial().safeParse(req.body);

    if (!id) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten(),
      });
    }

    const category = await prisma.mezmurCategory.update({
      where: { id },
      data: parsed.data,
    });

    return res.status(200).json({ category });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Category not found" });
    }

    console.error("Update mezmur category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMezmurCategory(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await prisma.mezmurCategory.delete({ where: { id } });
    return res.status(200).json({ category });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Category not found" });
    }

    console.error("Delete mezmur category error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
