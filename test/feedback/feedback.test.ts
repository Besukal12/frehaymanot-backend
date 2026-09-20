import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../setup.js";
import { setAuth } from "../helpers/auth.js";

describe("Feedback", () => {
  it("creates public feedback and persists it", async () => {
    const payload = {
      message: "Great course content!",
    };

    const res = await request(app).post("/api/feedback").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.feedback).toMatchObject(payload);

    const stored = await prisma.feedback.findUnique({
      where: { id: res.body.feedback.id },
    });
    expect(stored).toMatchObject(payload);
  });

  it("returns an empty list for authorized admins", async () => {
    setAuth("admin_1", "org:admin");
    const res = await request(app).get("/api/feedback");
    expect(res.status).toBe(200);
    expect(res.body.feedbacks).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it("lets admins read, sort, and delete feedback", async () => {
    const first = await request(app).post("/api/feedback").send({
      message: "First",
    });
    const second = await request(app).post("/api/feedback").send({
      message: "Second",
    });
    const firstId = first.body.feedback.id as number;
    const secondId = second.body.feedback.id as number;

    setAuth("admin_1", "org:admin");
    const list = await request(app).get("/api/feedback?sort=desc");
    expect(list.status).toBe(200);
    expect(list.body.feedbacks).toHaveLength(2);

    const detail = await request(app).get(`/api/feedback/${secondId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.feedback.message).toBe("Second");

    setAuth("member_1", "org:member");
    const forbiddenDelete = await request(app).delete(`/api/feedback/${firstId}`);
    expect(forbiddenDelete.status).toBe(403);
    expect(await prisma.feedback.findUnique({ where: { id: firstId } })).not.toBeNull();

    setAuth("admin_1", "org:admin");
    const deleted = await request(app).delete(`/api/feedback/${firstId}`);
    expect(deleted.status).toBe(200);
    expect(await prisma.feedback.findUnique({ where: { id: firstId } })).toBeNull();
    expect(await prisma.feedback.findUnique({ where: { id: secondId } })).not.toBeNull();
  });

  it("returns 400/404 for invalid and missing delete targets", async () => {
    setAuth("admin_1", "org:admin");
    expect((await request(app).delete("/api/feedback/abc")).status).toBe(400);
    expect((await request(app).delete("/api/feedback/9999")).status).toBe(404);
  });
});
