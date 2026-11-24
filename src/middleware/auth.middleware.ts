import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../core/CustomError.js";
import { verifyAccessToken } from "../lib/token.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string };
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "");
  if (!match) throw new UnauthorizedError("Authentication required");

  req.auth = verifyAccessToken(match[1]);
  next();
}
