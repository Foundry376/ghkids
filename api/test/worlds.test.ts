import { expect } from "chai";
import request from "supertest";
import app from "../src/app";
import { AppDataSource } from "../src/db/data-source";
import { World } from "../src/db/entity/world";
import { createTestUser } from "./helpers";
import { resetDatabase } from "./setup";

describe("Worlds API", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("GET /worlds/explore", () => {
    it("should return empty array when no worlds exist", async () => {
      const res = await request(app).get("/worlds/explore").expect(200);

      expect(res.body).to.be.an("array");
      expect(res.body).to.have.length(0);
    });

    it("should return worlds ordered by play count", async () => {
      const { user } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      await worldRepo.save([
        { name: "World A", thumbnail: "#", userId: user.id, playCount: 5, published: true },
        { name: "World B", thumbnail: "#", userId: user.id, playCount: 10, published: true },
        { name: "World C", thumbnail: "#", userId: user.id, playCount: 1, published: true },
      ]);

      const res = await request(app).get("/worlds/explore").expect(200);

      expect(res.body).to.have.length(3);
      expect(res.body[0].name).to.equal("World B");
      expect(res.body[1].name).to.equal("World A");
      expect(res.body[2].name).to.equal("World C");
    });
  });

  describe("GET /worlds/:objectId", () => {
    it("should return 404 for non-existent world", async () => {
      const res = await request(app).get("/worlds/99999").expect(404);

      expect(res.body.message).to.include("could not be found");
    });

    it("should return world and increment play count", async () => {
      const { user } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Test World",
        thumbnail: "#",
        userId: user.id,
        data: { test: "data" },
        playCount: 0,
      });

      const res = await request(app).get(`/worlds/${world.id}`).expect(200);

      expect(res.body.name).to.equal("Test World");
      expect(res.body.data).to.deep.equal({ test: "data" });
      expect(res.body.playCount).to.equal(1);

      // Verify play count was persisted (int8 returns string from PostgreSQL)
      const updatedWorld = await worldRepo.findOneBy({ id: world.id });
      expect(Number(updatedWorld!.playCount)).to.equal(1);
    });
  });

  describe("POST /worlds", () => {
    it("should return 401 without authentication", async () => {
      await request(app).post("/worlds").expect(401);
    });

    it("should create a new world with authentication", async () => {
      const { authHeader } = await createTestUser("testuser", "password123");

      const res = await request(app)
        .post("/worlds")
        .set("Authorization", authHeader)
        .expect(200);

      expect(res.body.name).to.equal("Untitled");
      expect(res.body.id).to.be.a("number");
    });
  });

  describe("GET /worlds?user=me", () => {
    it("should return 404 without authentication", async () => {
      const res = await request(app).get("/worlds?user=me").expect(404);

      expect(res.body.message).to.include("sign in");
    });

    it("should return user's worlds with authentication", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      await worldRepo.save([
        { name: "My World 1", thumbnail: "#", userId: user.id },
        { name: "My World 2", thumbnail: "#", userId: user.id },
      ]);

      const res = await request(app)
        .get("/worlds?user=me")
        .set("Authorization", authHeader)
        .expect(200);

      expect(res.body).to.have.length(2);
    });
  });

  describe("PUT /worlds/:objectId", () => {
    it("should return 401 without authentication", async () => {
      await request(app).put("/worlds/1").expect(401);
    });

    it("should update world name and data", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Original Name",
        thumbnail: "#",
        userId: user.id,
      });

      const res = await request(app)
        .put(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .send({ name: "Updated Name", data: { updated: true } })
        .expect(200);

      expect(res.body.name).to.equal("Updated Name");
      expect(res.body.data).to.deep.equal({ updated: true });
    });

    it("should return 404 for world owned by different user", async () => {
      const { user: owner } = await createTestUser("owner", "password123");
      const { authHeader: attackerAuth } = await createTestUser("attacker", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Owner's World",
        thumbnail: "#",
        userId: owner.id,
      });

      await request(app)
        .put(`/worlds/${world.id}`)
        .set("Authorization", attackerAuth)
        .send({ name: "Hacked Name" })
        .expect(404);
    });
  });

  describe("DELETE /worlds/:objectId", () => {
    it("should delete a world owned by the user", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "To Be Deleted",
        thumbnail: "#",
        userId: user.id,
      });

      await request(app)
        .delete(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .expect(200);

      const deletedWorld = await worldRepo.findOneBy({ id: world.id });
      expect(deletedWorld).to.be.null;
    });
  });
});
