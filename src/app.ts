import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cookieParser from "cookie-parser";
import Logger from "./core/Logger.js";
import { AppError } from "./core/AppError.js";
import { InternalError, PayloadTooLargeError } from "./core/CustomError.js";
import authRouter from "./modules/auth/auth.route.js";

const app = express();

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

let items = [
  { id: 1, name: "Item One" },
  { id: 2, name: "Item Two" },
];

app.get("/health", (req, res) => {
  res.json({
    items,
    message: "This is health check for frehaymanot.",
  });
});

app.use("/api/auth", authRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      Logger.error(
        String(err.statusCode) +
          " " +
          req.method +
          " " +
          req.originalUrl +
          ": " +
          err.message,
      );
      if (err.stack) Logger.error(err.stack);
    }
    AppError.handle(err, res);
    return;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.too.large"
  ) {
    AppError.handle(new PayloadTooLargeError(), res);
    return;
  }
  Logger.error("Unhandled error " + req.method + " " + req.originalUrl, err);
  AppError.handle(new InternalError(), res);
});

export default app;
