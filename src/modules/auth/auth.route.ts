import { Router } from "express";
import { LoginHandler, RegisterHandler, RefreshTokenHandler, LogoutHandler } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", RegisterHandler);
authRouter.post("/login", LoginHandler);
authRouter.post("/refresh", RefreshTokenHandler);
authRouter.post('/logout', LogoutHandler)

export default authRouter;