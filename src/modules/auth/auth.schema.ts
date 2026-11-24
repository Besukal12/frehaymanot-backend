import { z } from "zod";
import { Gender } from "../../generated/prisma/enums.js";
import {
  PasswordSchema,
  PhoneSchema,
  UsernameSchema,
} from "../../lib/validation.js";

export const RegisterSchema = z
  .object({
    username: UsernameSchema,
    phone: PhoneSchema,
    gender: z.enum(Gender),
    password: PasswordSchema,
  })
  .strict();

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema,
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: PasswordSchema,
    newPassword: PasswordSchema,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
