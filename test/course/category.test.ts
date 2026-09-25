import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../setup.js";
import { setAuth } from "../helpers/auth.js";

describe("Course categories", () => {
  const endpoint = "/api/course/categories";

  it("rejects unauthenticated create", async () => {
    setAuth(null);
    const response = await request(app)
      .post(endpoint)
      .send({ name: "Grade 1" });

    expect(response.status).toBe(401);
    expect(await prisma.courseCategory.count()).toBe(0);
  });

  it("creates, lists, updates, and deletes a category", async () => {
    setAuth("admin_1", "org:admin");
    const created = await request(app).post(endpoint).send({
      name: "Grade 1",
      description: "Introductory courses",
    });

    expect(created.status).toBe(201);
    expect(created.body.category).toMatchObject({
      name: "Grade 1",
      description: "Introductory courses",
    });

    const listed = await request(app).get(endpoint);
    expect(listed.status).toBe(200);
    expect(listed.body.categories[0]._count.courses).toBe(0);
    expect(listed.body.categories[0].imageStorageId).toBeUndefined();

    const id = created.body.category.id;
    const updated = await request(app)
      .patch(`${endpoint}/${id}`)
      .send({ name: "Grade One" });
    expect(updated.status).toBe(200);
    expect(updated.body.category.name).toBe("Grade One");

    const deleted = await request(app).delete(`${endpoint}/${id}`);
    expect(deleted.status).toBe(200);
    expect(
      await prisma.courseCategory.findUnique({ where: { id } }),
    ).toBeNull();
  });

  it("validates missing and unknown course categories", async () => {
    setAuth("owner_1");

    const missing = await request(app)
      .post("/api/course")
      .field("title", "Intro")
      .field("grade", "5");
    expect(missing.status).toBe(400);

    const unknown = await request(app)
      .post("/api/course")
      .field("title", "Intro")
      .field("grade", "5")
      .field("categoryId", "9999");
    expect(unknown.status).toBe(404);
  });
});
