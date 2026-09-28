import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../setup.js";
import { setAuth } from "../helpers/auth.js";

describe("Announcements", () => {
  it("rejects unauthenticated create", async () => {
    const res = await request(app).post("/api/announcements").send({
      title: "Hello",
      content: "Welcome",
    });
    expect(res.status).toBe(401);
    expect(await prisma.announcement.count()).toBe(0);
  });

  it("rejects invalid payloads", async () => {
    setAuth("owner_1");
    const res = await request(app).post("/api/announcements").send({
      title: " ",
      content: "",
      audience: "INVALID",
    });
    expect(res.status).toBe(400);
    expect(await prisma.announcement.count()).toBe(0);
  });

  it("creates with a generated slug and lists announcements", async () => {
    setAuth("owner_1");
    const created = await request(app).post("/api/announcements").send({
      title: "New Semester",
      content: "Classes begin Monday",
    });

    expect(created.status).toBe(201);
    expect(created.body.announcement.slug).toBe("new-semester");
    expect(created.body.announcement.audience).toBe("EVERYONE");
    expect(
      await prisma.announcement.findUnique({
        where: { id: created.body.announcement.id },
      }),
    ).not.toBeNull();

    const list = await request(app).get("/api/announcements");
    expect(list.status).toBe(200);
    expect(list.body.announcements).toHaveLength(1);
    expect(list.body.announcements[0].audience).toBe("EVERYONE");
  });

  it("enforces owner/admin authorization on update and delete", async () => {
    setAuth("owner_1");
    const created = await request(app).post("/api/announcements").send({
      title: "Keep",
      slug: "keep-me",
      content: "Original",
    });
    const id = created.body.announcement.id as number;

    setAuth("intruder");
    const forbidden = await request(app)
      .patch(`/api/announcements/${id}`)
      .send({ content: "Hacked" });
    expect(forbidden.status).toBe(403);
    expect(
      (await prisma.announcement.findUnique({ where: { id } }))?.content,
    ).toBe("Original");

    expect((await request(app).delete(`/api/announcements/${id}`)).status).toBe(
      403,
    );
    expect(
      await prisma.announcement.findUnique({ where: { id } }),
    ).not.toBeNull();

    setAuth("admin_1", "org:admin");
    const updated = await request(app)
      .patch(`/api/announcements/${id}`)
      .send({ content: "Revised", audience: "CHILDREN" });
    expect(updated.status).toBe(200);
    expect(
      (await prisma.announcement.findUnique({ where: { id } }))?.content,
    ).toBe("Revised");
    expect(
      (await prisma.announcement.findUnique({ where: { id } }))?.audience,
    ).toBe("CHILDREN");

    const deleted = await request(app).delete(`/api/announcements/${id}`);
    expect(deleted.status).toBe(200);
    expect(await prisma.announcement.findUnique({ where: { id } })).toBeNull();
  });

  it("returns 400/404 for invalid and missing ids", async () => {
    setAuth("owner_1");
    expect((await request(app).get("/api/announcements/abc")).status).toBe(400);
    expect((await request(app).get("/api/announcements/9999")).status).toBe(
      404,
    );
  });
});
