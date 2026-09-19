import z from "zod";

export const CourseSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional(),
  grade: z.coerce.number().int().min(1).max(12),
  categoryId: z.coerce.number().int().positive(),
});

export const CourseCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
});
