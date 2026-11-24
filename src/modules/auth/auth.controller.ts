import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  StudentProfileSchema,
} from "./auth.schema.js";
import { ConflictError, UnauthorizedError } from "../../core/CustomError.js";
import { hashPassword, checkPassword } from "../../lib/hash.js";
import {
  assertTrustedOrigin,
  setRefreshCookie,
  validationError,
  clearRefreshCookie,
  refreshCookieName,
} from "./auth.service.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../../lib/token.js";

export async function RegisterHandler(
  req: Request,
  res: Response,
): Promise<void> {
  assertTrustedOrigin(req);

  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error.issues);

  const data = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { username: data.username },
    select: { id: true },
  });

  if (existingUser)
    throw new ConflictError("An account with this username already exists");

  const passwordHash = await hashPassword(data.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username,
          phone: data.phone,
          gender: data.gender,
          passwordHash,
        },
        select: {
          id: true,
          username: true,
          phone: true,
          gender: true,
          createdAt: true,
        },
      });

      const refreshToken = createRefreshToken(user.id);
      const expiresAt = verifyRefreshToken(refreshToken).expiresAt;

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(refreshToken),
          expiresAt,
        },
      });

      return { user, refreshToken };
    });

    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      message: "Registration successful",
      user: result.user,
      accessToken: createAccessToken(result.user.id),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError("An account with this username already exists");
    throw error;
  }
}

export async function LoginHandler(req: Request, res: Response): Promise<void> {
  assertTrustedOrigin(req);

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error.issues);

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: {
      id: true,
      username: true,
      phone: true,
      gender: true,
      status: true,
      passwordHash: true,
    },
  });

  if (
    !user ||
    user.status !== "ACTIVE" ||
    !(await checkPassword(parsed.data.password, user.passwordHash))
  )
    throw new UnauthorizedError("Username or password is incorrect");

  const refreshToken = createRefreshToken(user.id);
  const expiresAt = verifyRefreshToken(refreshToken).expiresAt;

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  setRefreshCookie(res, refreshToken);
  res.status(200).json({
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      phone: user.phone,
      gender: user.gender,
    },
    accessToken: createAccessToken(user.id),
  });
}

export async function RefreshTokenHandler(
  req: Request,
  res: Response,
): Promise<void> {
  assertTrustedOrigin(req);

  const token = req.cookies?.[refreshCookieName];
  if (typeof token !== "string")
    throw new UnauthorizedError("Authentication required");

  const { userId, expiresAt } = verifyRefreshToken(token);
  const tokenHash = hashRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    clearRefreshCookie(res);
    throw new UnauthorizedError("Authentication required");
  }

  if (
    !stored ||
    stored.userId !== userId ||
    stored.expiresAt <= new Date() ||
    expiresAt <= new Date()
  ) {
    if (!stored) await prisma.refreshToken.deleteMany({ where: { userId } });
    clearRefreshCookie(res);
    throw new UnauthorizedError(
      "Refresh token is invalid or has already been used",
    );
  }

  const nextToken = createRefreshToken(userId);
  const nextExpiry = verifyRefreshToken(nextToken).expiresAt;

  const rotated = await prisma.$transaction(async (tx) => {
    const removed = await tx.refreshToken.deleteMany({
      where: { id: stored.id },
    });
    if (removed.count !== 1) return false;
    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(nextToken),
        expiresAt: nextExpiry,
      },
    });
    return true;
  });

  if (!rotated) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    clearRefreshCookie(res);
    throw new UnauthorizedError("Refresh token has already been used");
  }

  setRefreshCookie(res, nextToken);
  res.status(200).json({ accessToken: createAccessToken(userId) });
}

export async function LogoutHandler(
  req: Request,
  res: Response,
): Promise<void> {
  assertTrustedOrigin(req);

  const token = req.cookies?.[refreshCookieName];
  if (typeof token === "string")
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashRefreshToken(token) },
    });

  clearRefreshCookie(res);
  res.status(204).end();
}

export async function ChangePasswordHandler(
  req: Request,
  res: Response,
): Promise<void> {
  assertTrustedOrigin(req);

  const parsed = ChangePasswordSchema.safeParse(req.body);

  if (!parsed.success) throw validationError(parsed.error.issues);
  if (!req.auth) throw new UnauthorizedError("Authentication required");

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, passwordHash: true, status: true },
  });

  if (!user || user.status !== "ACTIVE")
    throw new UnauthorizedError("Authentication required");

  if (!(await checkPassword(parsed.data.currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await tx.refreshToken.deleteMany({ where: { userId: user.id } });
  });

  clearRefreshCookie(res);
  res.status(200).json({
    message: "Password changed. Please sign in again on your other devices.",
  });
}

export async function GetCurrentUserHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) throw new UnauthorizedError("Authentication required");

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: {
      id: true,
      username: true,
      phone: true,
      gender: true,
      status: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE")
    throw new UnauthorizedError("Authentication required");

  res.status(200).json({ user });
}

export async function CreateStudentProfileHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) throw new UnauthorizedError("Authentication required");

  const parsed = StudentProfileSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error.issues);

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== "ACTIVE")
    throw new UnauthorizedError("Authentication required");

  try {
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        fullName: parsed.data.fullName,
        dateOfBirth: new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`),
        guardianPhone: parsed.data.guardianPhone,
        woreda: parsed.data.woreda,
        area: parsed.data.area,
        currentStatus: parsed.data.currentStatus,
        attendedPreviousSchool: parsed.data.attendedPreviousSchool,
        previousSchoolName: parsed.data.previousSchoolName,
        evidenceImageUrl: parsed.data.evidenceImageUrl,
        evidenceStorageKey: parsed.data.evidenceStorageKey,
      },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        guardianPhone: true,
        woreda: true,
        area: true,
        currentStatus: true,
        attendedPreviousSchool: true,
        previousSchoolName: true,
        evidenceImageUrl: true,
        membershipStatus: true,
        registrationDate: true,
      },
    });

    res.status(201).json({
      message: "Student profile submitted for review",
      student,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictError("A student profile already exists for this user");
    throw error;
  }
}
