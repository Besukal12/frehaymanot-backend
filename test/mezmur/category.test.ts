import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../setup.js";
import { setAuth } from "../helpers/auth.js";

describe("Mezmur categories", () => {
  const endpoint = "/api/mezmur/categories-add";

  it("rejects unauthenticated create", async () => {
    const res = await request(app).post(endpoint).send({
      name: "Lent",
      description: "Lenten hymns",
    });

    expect(res.status).toBe(401);
    const count = await prisma.mezmurCategory.count();
    expect(count).toBe(0);
  });

  it("rejects invalid input", async () => {
    setAuth("user_1", "org:admin");
    const res = await request(app).post(endpoint).send({
      name: "",
      description: "x".repeat(501),
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid input");
    expect(await prisma.mezmurCategory.count()).toBe(0);
  });

  it("creates a category and persists it", async () => {
    setAuth("user_1");
    const payload = { name: "Fasika", description: "Easter hymns" };
    const res = await request(app).post(endpoint).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.category).toMatchObject(payload);
    expect(res.body.category.id).toBeDefined();

    const stored = await prisma.mezmurCategory.findUnique({
      where: { id: res.body.category.id },
    });
    expect(stored).toMatchObject(payload);
  });

  it("lists categories including empty state", async () => {
    const empty = await request(app).get("/api/mezmur/categories-get");
    expect(empty.status).toBe(200);
    expect(empty.body.categories).toEqual([]);

    setAuth("user_1");
    await request(app).post(endpoint).send({
      name: "Kidase",
      description: "Liturgy",
    });

    const list = await request(app).get("/api/mezmur/categories-get");
    expect(list.status).toBe(200);
    expect(list.body.categories).toHaveLength(1);
    expect(list.body.categories[0]._count.Mezmurs).toBe(0);
  });

  it("updates an existing category", async () => {
    setAuth("user_1");
    const created = await request(app).post(endpoint).send({
      name: "Old",
      description: "Old desc",
    });
    const id = created.body.category.id;

    const updated = await request(app)
      .patch(`/api/mezmur/categories-update/${id}`)
      .send({ name: "New" });

    expect(updated.status).toBe(200);
    expect(updated.body.category.name).toBe("New");

    const stored = await prisma.mezmurCategory.findUnique({ where: { id } });
    expect(stored?.name).toBe("New");
  });

  it("returns 404 for missing and invalid category ids", async () => {
    setAuth("user_1");
    const missing = await request(app)
      .patch("/api/mezmur/categories-update/9999")
      .send({ name: "Nope" });
    expect(missing.status).toBe(404);

    const invalid = await request(app)
      .delete("/api/mezmur/categories-delete/abc")
      .send();
    expect(invalid.status).toBe(404);
  });

  it("deletes a category and removes it from the database", async () => {
    setAuth("user_1");
    const created = await request(app).post(endpoint).send({
      name: "Temp",
      description: "To delete",
    });
    const id = created.body.category.id;

    const deleted = await request(app).delete(
      `/api/mezmur/categories-delete/${id}`,
    );
    expect(deleted.status).toBe(200);
    expect(await prisma.mezmurCategory.findUnique({ where: { id } })).toBeNull();
  });
});
