import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../setup.js";
import { setAuth } from "../helpers/auth.js";
import { PDF_BYTES, PNG_BYTES } from "../helpers/files.js";

async function createCategory() {
  setAuth("owner_1");
  const res = await request(app).post("/api/course/categories").send({
    name: "Theology",
    description: "Core",
  });
  return res.body.category.id as number;
}

describe("Course resources", () => {
  it("rejects unauthenticated create", async () => {
    const categoryId = await createCategory();
    setAuth(null);

    const res = await request(app)
      .post("/api/course/create")
      .field("title", "Intro")
      .field("grade", "5")
      .attach("thumbnail", PNG_BYTES, {
        filename: "t.png",
        contentType: "image/png",
      })
      .attach("pdf", PDF_BYTES, {
        filename: "c.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(401);
    expect(await prisma.course.count()).toBe(0);
  });

  it("rejects invalid grade and missing files", async () => {
    const categoryId = await createCategory();
    setAuth("owner_1");

    const invalidGrade = await request(app).post("/api/course/create").send({
      title: "Intro",
      grade: 99,
      categoryId,
    });
    expect(invalidGrade.status).toBe(400);

    const missingFiles = await request(app)
      .post("/api/course/create")
      .field("title", "Intro")
      .field("grade", "5");
    expect(missingFiles.status).toBe(400);
    expect(await prisma.course.count()).toBe(0);
  });

  it("creates, reads, forbids non-owners, and deletes as admin", async () => {
    const categoryId = await createCategory();
    setAuth("owner_1");

    const created = await request(app)
      .post("/api/course/create")
      .field("title", "Dogma")
      .field("grade", "7")
      .attach("thumbnail", PNG_BYTES, {
        filename: "t.png",
        contentType: "image/png",
      })
      .attach("pdf", PDF_BYTES, {
        filename: "c.pdf",
        contentType: "application/pdf",
      });

    expect(created.status).toBe(201);
    const id = created.body.course.id as number;
    expect(await prisma.course.findUnique({ where: { id } })).not.toBeNull();

    const listed = await request(app).get("/api/course/get");
    expect(listed.status).toBe(200);
    expect(listed.body.courses).toHaveLength(1);

    const byId = await request(app).get(`/api/course/get/${id}`);
    expect(byId.status).toBe(200);
    expect(byId.body.course.title).toBe("Dogma");

    expect((await request(app).get("/api/course/get/abc")).status).toBe(400);
    expect((await request(app).get("/api/course/get/9999")).status).toBe(404);

    setAuth("intruder");
    const forbidden = await request(app)
      .patch(`/api/course/update/${id}`)
      .field("title", "Hacked");
    expect(forbidden.status).toBe(403);
    expect((await prisma.course.findUnique({ where: { id } }))?.title).toBe(
      "Dogma",
    );

    setAuth("admin_1", "admin");
    const updated = await request(app)
      .patch(`/api/course/update/${id}`)
      .field("title", "Updated dogma");
    expect(updated.status).toBe(200);
    expect(updated.body.course.title).toBe("Updated dogma");

    const deleted = await request(app).delete(`/api/course/delete/${id}`);
    expect(deleted.status).toBe(200);
    expect(await prisma.course.findUnique({ where: { id } })).toBeNull();
  });
});
