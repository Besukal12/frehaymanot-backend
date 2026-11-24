import { Router } from "express";
import {
  LoginHandler,
  RegisterHandler,
  RefreshTokenHandler,
  LogoutHandler,
  ChangePasswordHandler,
  GetCurrentUserHandler,
} from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", RegisterHandler);
authRouter.post("/login", LoginHandler);
authRouter.post("/refresh", RefreshTokenHandler);
authRouter.post("/logout", LogoutHandler);
authRouter.post("/change-password", requireAuth, ChangePasswordHandler);
authRouter.get("/me", requireAuth, GetCurrentUserHandler);

export default authRouter;
