import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { RegisterSchema } from "./auth.schema.js";
import { ConflictError } from "../../core/CustomError.js";
import { hashPassword } from "../../lib/hash.js";
import {
  assertTrustedOrigin,
  setRefreshCookie,
  validationError,
} from "./auth.service.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../../lib/token.js";

export async function RegisterHandler(req: Request, res: Response) {
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
