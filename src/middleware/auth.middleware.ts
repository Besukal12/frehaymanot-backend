import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "org:admin";
}

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const isAuthenticated = !!auth.userId;
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Unauthorized", message: "Unauthorized" });
  }
  next();
}

export function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Unauthorized", message: "Unauthorized" });
  }
  if (!isAdminRole(auth.orgRole)) {
    return res.status(403).json({ error: "Forbidden", message: "Forbidden" });
  }
  next();
}

export function checkUser(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const isUser = auth.orgRole === "user" || auth.orgRole === "org:member";
  if (!isUser) {
    return res.status(403).json({ error: "Forbidden", message: "Forbidden" });
  }
  next();
}
