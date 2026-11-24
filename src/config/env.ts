import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
loadEnv({ path: path.join(backendDir, ".env") });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .url()
    .refine(
      (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
      { message: "DATABASE_URL must be a PostgreSQL connection URL" },
    ),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_DIR: z.string().default("./logs"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  WEB_ORIGIN: z.url().optional(),
});

export const env = envSchema.parse(process.env);
