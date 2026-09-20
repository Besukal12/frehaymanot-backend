import z from "zod";

export const MezmurSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.coerce.number().int().positive(),
  mezmurPoem: z.string().trim().min(1),
});
