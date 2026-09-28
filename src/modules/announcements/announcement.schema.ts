import z from "zod";

const AnnouncementAudienceSchema = z.enum([
  "YOUTH",
  "CENTRAL",
  "CHILDREN",
  "EVERYONE",
]);

export const CreateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    )
    .optional(),
  content: z.string().trim().min(1),
  audience: AnnouncementAudienceSchema.default("EVERYONE"),
  postedAt: z.coerce.date().optional(),
});

export const UpdateAnnouncementSchema =
  CreateAnnouncementSchema.partial().extend({
    audience: AnnouncementAudienceSchema.optional(),
  });
