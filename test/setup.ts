import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, afterAll } from "vitest";
import { clearAuth } from "./helpers/auth.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = "test";

dotenv.config({ path: path.resolve(dirname, "../.env.test") });
dotenv.config({ path: path.resolve(dirname, "../.env") });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (process.env.ALLOW_TEST_ON_DATABASE_URL !== "true") {
  throw new Error(
    "Tests require TEST_DATABASE_URL (isolated database). Set ALLOW_TEST_ON_DATABASE_URL=true only for a dedicated local database that may be wiped.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing after test environment setup.");
}

if (
  /prod(?:uction)?/i.test(process.env.DATABASE_URL) &&
  !/test/i.test(process.env.DATABASE_URL)
) {
  throw new Error(
    "Refusing to run tests against a production-looking database URL. Set TEST_DATABASE_URL.",
  );
}

const { prisma } = await import("../src/config/prisma.js");

async function resetDatabase() {
  await prisma.feedback.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.mezmur.deleteMany();
  await prisma.course.deleteMany();
  await prisma.courseCategory.deleteMany();
  await prisma.mezmurCategory.deleteMany();
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  clearAuth();
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

export { prisma };
