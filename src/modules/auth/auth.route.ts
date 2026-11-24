import { Router } from "express";
import { RegisterHandler } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/register", RegisterHandler);

export default authRouter;