import { z } from "zod";
import {
  Gender,
  StudentCurrentStatus,
} from "../../generated/prisma/enums.js";
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

export const StudentProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    dateOfBirth: z.iso
      .date()
      .refine((date) => date <= new Date().toISOString().slice(0, 10), {
        message: "Date of birth cannot be in the future",
      }),
    guardianPhone: PhoneSchema.nullable().optional(),
    woreda: z.string().trim().min(1).max(100),
    area: z.string().trim().min(1).max(100),
    currentStatus: z.enum(StudentCurrentStatus),
    attendedPreviousSchool: z.boolean().default(false),
    previousSchoolName: z.string().trim().min(1).max(120).optional(),
    evidenceImageUrl: z
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          url.hostname === "res.cloudinary.com"
        );
      }, "Evidence must be a secure Cloudinary URL")
      .optional(),
    evidenceStorageKey: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const [birthYear, birthMonth, birthDay] = data.dateOfBirth
      .split("-")
      .map(Number);
    const now = new Date();
    const age =
      now.getUTCFullYear() -
      birthYear -
      (now.getUTCMonth() + 1 < birthMonth ||
      (now.getUTCMonth() + 1 === birthMonth &&
        now.getUTCDate() < birthDay)
        ? 1
        : 0);

    if (age < 18 && !data.guardianPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["guardianPhone"],
        message: "Guardian phone is required for students under 18",
      });
    }

    if (data.attendedPreviousSchool && !data.previousSchoolName) {
      ctx.addIssue({
        code: "custom",
        path: ["previousSchoolName"],
        message: "Previous school name is required when applicable",
      });
    }

    if (!data.attendedPreviousSchool) {
      if (data.previousSchoolName) {
        ctx.addIssue({
          code: "custom",
          path: ["previousSchoolName"],
          message:
            "Previous school name cannot be provided when no previous school was attended",
        });
      }
      if (data.evidenceImageUrl || data.evidenceStorageKey) {
        ctx.addIssue({
          code: "custom",
          path: ["evidenceImageUrl"],
          message:
            "Previous-school evidence can only be provided when a previous school was attended",
        });
      }
    }

    if (Boolean(data.evidenceImageUrl) !== Boolean(data.evidenceStorageKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["evidenceStorageKey"],
        message: "Both the Cloudinary URL and public ID are required",
      });
    }
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
