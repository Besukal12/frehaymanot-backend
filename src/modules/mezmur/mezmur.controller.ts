import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { MezmurSchema } from "./mezmur.schema.js";
import { parsePositiveInt } from "../../lib/ids.js";

const publicMezmurSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  mezmurPoem: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  },
} as const;

const publicMezmurSummarySelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  mezmurPoem: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  },
} as const;

export async function addMezmur(req: Request, res: Response) {
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

    const category = await prisma.mezmurCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Mezmur category not found" });
    }

    const mezmur = await prisma.mezmur.create({
      data: {
        ...parsed.data,
        uploadedBy: userId,
      },
      select: publicMezmurSelect,
    });

    return res.status(201).json({
      message: "Mezmur created successfully",
      mezmur,
    });
  } catch (error) {
    console.error("Add mezmur error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMezmurs(_req: Request, res: Response) {
  try {
    const mezmurRows = await prisma.mezmur.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: publicMezmurSummarySelect,
    });
    const mezmurs = mezmurRows.map(({ mezmurPoem, ...mezmur }) => ({
      ...mezmur,
      poemFirstLine: mezmurPoem.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "",
    }));

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

    if (parsed.data.categoryId !== undefined) {
      const category = await prisma.mezmurCategory.findUnique({
        where: { id: parsed.data.categoryId },
      });

      if (!category) {
        return res.status(404).json({ message: "Mezmur category not found" });
      }
    }

    const mezmur = await prisma.mezmur.update({
      where: { id },
      data: parsed.data,
      select: publicMezmurSelect,
    });

    return res.status(200).json({
      message: "Mezmur updated successfully",
      mezmur,
    });
  } catch (error) {
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

    return res.status(200).json({
      message: "Mezmur deleted successfully",
      mezmur,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Mezmur not found" });
    }

    console.error("Delete mezmur error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
