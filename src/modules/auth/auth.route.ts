import { Router } from "express";
import { LoginHandler, RegisterHandler } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", RegisterHandler);
authRouter.post("/login", LoginHandler);

export default authRouter;