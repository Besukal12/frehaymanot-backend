import z from "zod";

export const MezmurSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.coerce.number().int().positive(),
  mezmurPoem: z.string().trim().min(1),
});

export const MezmurCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});
