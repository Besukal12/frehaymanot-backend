import { z } from "zod";
import { Gender } from "../../generated/prisma/enums.js";

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$/, {
        message:
          "Username must use letters, numbers, dots, underscores, or hyphens, and start and end with a letter or number",
      }),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(16)
      .regex(/^\+?[0-9]{7,15}$/, {
        message:
          "Phone must contain 7 to 15 digits, optionally prefixed with +",
      }),
    gender: z.enum(Gender),
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/^[^\u0000-\u001F\u007F]+$/, {
        message: "Password must not contain control characters",
      }),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
