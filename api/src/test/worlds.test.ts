import { expect } from "chai";
import sinon from "sinon";
import request from "supertest";
import app from "../app";
import * as email from "../connectors/email";
import { AppDataSource } from "../db/data-source";
import { User } from "../db/entity/user";
import { World } from "../db/entity/world";
import { WorldVersion } from "../db/entity/world-version";
import { AddWorldVersions1794400000000 } from "../db/migrations/1794400000000-AddWorldVersions";
import { createTestUser, publishWorld, saveWorld, saveWorlds } from "./helpers";
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

      await saveWorlds([
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

    async function seedPublished() {
      const { user: dave } = await createTestUser("dave", "password123");
      const { user: marcus } = await createTestUser("marcus", "password123");
      await saveWorlds([
        { name: "Space Invaders", thumbnail: "#", userId: dave.id, playCount: 3, published: true },
        { name: "Train World", thumbnail: "#", userId: dave.id, playCount: 9, published: true },
        { name: "Space Race", thumbnail: "#", userId: marcus.id, playCount: 7, published: true },
        { name: "100% Fun", thumbnail: "#", userId: marcus.id, playCount: 1, published: true },
        {
          name: "Space Secret",
          thumbnail: "#",
          userId: marcus.id,
          playCount: 99,
          published: false,
        },
      ]);
    }

    it("leaves out unpublished worlds", async () => {
      await seedPublished();
      const res = await request(app).get("/worlds/explore").expect(200);
      expect(res.body.map((w: { name: string }) => w.name)).to.not.include("Space Secret");
    });

    it("searches titles, case-insensitively", async () => {
      await seedPublished();
      const res = await request(app).get("/worlds/explore").query({ q: "space" }).expect(200);
      expect(res.body.map((w: { name: string }) => w.name)).to.deep.equal([
        "Space Race",
        "Space Invaders",
      ]);
    });

    it("searches author usernames", async () => {
      await seedPublished();
      const res = await request(app).get("/worlds/explore").query({ q: "Marcus" }).expect(200);
      expect(res.body.map((w: { name: string }) => w.name)).to.deep.equal([
        "Space Race",
        "100% Fun",
      ]);
    });

    it("treats % and _ in a search as plain text", async () => {
      await seedPublished();
      const percent = await request(app).get("/worlds/explore").query({ q: "0%" }).expect(200);
      expect(percent.body.map((w: { name: string }) => w.name)).to.deep.equal(["100% Fun"]);
      const underscore = await request(app).get("/worlds/explore").query({ q: "_" }).expect(200);
      expect(underscore.body).to.have.length(0);
    });

    it("pages through with offset and limit, most played first", async () => {
      await seedPublished();
      const first = await request(app).get("/worlds/explore").query({ limit: 2 }).expect(200);
      const second = await request(app)
        .get("/worlds/explore")
        .query({ limit: 2, offset: 2 })
        .expect(200);
      expect(first.body.map((w: { name: string }) => w.name)).to.deep.equal([
        "Train World",
        "Space Race",
      ]);
      expect(second.body.map((w: { name: string }) => w.name)).to.deep.equal([
        "Space Invaders",
        "100% Fun",
      ]);
    });

    it("caps the page size", async () => {
      await seedPublished();
      const res = await request(app).get("/worlds/explore").query({ limit: 5000 }).expect(200);
      expect(res.body).to.have.length(4);
      const bogus = await request(app).get("/worlds/explore").query({ limit: "lots" }).expect(200);
      expect(bogus.body).to.have.length(4);
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
      const world = await saveWorld({
        name: "Test World",
        thumbnail: "#",
        userId: user.id,
        data: { test: "data" },
        playCount: 0,
        published: true,
      });

      const res = await request(app).get(`/worlds/${world.id}`).expect(200);

      expect(res.body.name).to.equal("Test World");
      expect(res.body.data).to.deep.equal({ test: "data" });
      expect(res.body.playCount).to.equal(1);

      // Verify play count was persisted (int8 returns string from PostgreSQL)
      const updatedWorld = await worldRepo.findOneBy({ id: world.id });
      expect(Number(updatedWorld!.playCount)).to.equal(1);
    });

    it("should only return the unsaved draft to the owner", async () => {
      const { user, authHeader } = await createTestUser("owner", "password123");
      const { authHeader: otherAuthHeader } = await createTestUser("other", "password123");

      const world = await saveWorld({
        name: "Published World",
        thumbnail: "#",
        userId: user.id,
        published: true,
        data: { saved: true },
        unsavedData: { draft: true },
        unsavedDataUpdatedAt: new Date(),
      });

      const anonymous = await request(app).get(`/worlds/${world.id}`).expect(200);
      expect(anonymous.body.data).to.deep.equal({ saved: true });
      expect(anonymous.body.unsavedData).to.be.null;

      const other = await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", otherAuthHeader)
        .expect(200);
      expect(other.body.unsavedData).to.be.null;

      const owner = await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .expect(200);
      expect(owner.body.unsavedData).to.deep.equal({ draft: true });
    });

    it("hides an unpublished world from everyone but its owner", async () => {
      const { user: owner, authHeader: ownerAuth } = await createTestUser("owner", "password123");
      const { authHeader: otherAuth } = await createTestUser("other", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Secret World",
        thumbnail: "#",
        userId: owner.id,
        data: { test: "data" },
        published: false,
      });

      const anon = await request(app).get(`/worlds/${world.id}`).expect(404);
      expect(anon.body.data).to.be.undefined;
      await request(app).get(`/worlds/${world.id}`).set("Authorization", otherAuth).expect(404);

      const mine = await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", ownerAuth)
        .expect(200);
      expect(mine.body.data).to.deep.equal({ test: "data" });
    });

    it("rejects a stale saved login asking for its own games", async () => {
      await createTestUser("owner", "password123");
      const wrongPassword = `Basic ${Buffer.from("owner:oldpassword").toString("base64")}`;

      await request(app).get("/worlds?user=me").set("Authorization", wrongPassword).expect(403);
      await request(app).get("/worlds?user=me").expect(404);
    });

    it("treats a stale saved login as signed out", async () => {
      const { user } = await createTestUser("owner", "password123");
      const world = await saveWorld({
        name: "Published World",
        thumbnail: "#",
        userId: user.id,
        published: true,
      });
      const wrongPassword = `Basic ${Buffer.from("owner:oldpassword").toString("base64")}`;
      const deletedAccount = `Basic ${Buffer.from("gone:password123").toString("base64")}`;

      await request(app).get(`/worlds/${world.id}`).set("Authorization", wrongPassword).expect(200);
      await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", deletedAccount)
        .expect(200);
      const list = await request(app)
        .get("/worlds?user=owner")
        .set("Authorization", wrongPassword)
        .expect(200);
      expect(list.body).to.have.length(1);
    });

    it("leaves off an unpublished game a published remix came from", async () => {
      const { user: maker, authHeader: makerAuth } = await createTestUser("maker", "password123");
      const { user: remixer } = await createTestUser("remixer", "password123");
      const worldRepo = AppDataSource.getRepository(World);
      const original = await worldRepo.save({
        name: "Secret Original",
        thumbnail: "#",
        userId: maker.id,
        published: false,
      });
      const remix = await saveWorld({
        name: "Public Remix",
        thumbnail: "#",
        userId: remixer.id,
        published: true,
        forkParentId: original.id,
      });

      const play = await request(app).get(`/worlds/${remix.id}`).expect(200);
      expect(play.body.forkParent).to.equal(null);
      const explore = await request(app).get("/worlds/explore").expect(200);
      expect(explore.body[0].forkParent).to.equal(null);
      const profile = await request(app).get("/worlds?user=remixer").expect(200);
      expect(profile.body[0].forkParent).to.equal(null);

      // The original's maker can still see where the remix came from.
      const mine = await request(app)
        .get(`/worlds/${remix.id}`)
        .set("Authorization", makerAuth)
        .expect(200);
      expect(mine.body.forkParent.name).to.equal("Secret Original");

      // And once the original is published, everyone can.
      await publishWorld(original);
      const later = await request(app).get(`/worlds/${remix.id}`).expect(200);
      expect(later.body.forkParent.name).to.equal("Secret Original");
    });

    it("serves the tutorial world even though it isn't published", async () => {
      const { user } = await createTestUser("admin", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Tutorial",
        thumbnail: "#",
        userId: user.id,
        published: false,
      });
      const previous = process.env.TUTORIAL_WORLD_ID;
      process.env.TUTORIAL_WORLD_ID = String(world.id);
      try {
        const res = await request(app).get("/worlds/tutorial").expect(200);
        expect(res.body.name).to.equal("Tutorial");
      } finally {
        process.env.TUTORIAL_WORLD_ID = previous;
      }
    });
  });

  // Plays and remixes are other people's doing: they count, but they don't
  // change the game, so the owner's My Games (newest first) shouldn't reorder.
  describe("play and remix counts", () => {
    const longAgo = new Date("2024-01-02T03:04:05.000Z");

    const makeOldWorld = async (userId: string) => {
      const worldRepo = AppDataSource.getRepository(World);
      const world = await saveWorld({
        name: "Old World",
        thumbnail: "#",
        userId,
        data: { test: "data" },
        playCount: 0,
        forkCount: 0,
        published: true,
      });
      await worldRepo
        .createQueryBuilder()
        .update()
        .set({ updatedAt: longAgo })
        .where("id = :id", { id: world.id })
        .execute();
      return world;
    };

    it("counts a play without changing updatedAt", async () => {
      const { user } = await createTestUser("owner", "password123");
      const world = await makeOldWorld(user.id);

      const res = await request(app).get(`/worlds/${world.id}`).expect(200);
      expect(res.body.playCount).to.equal(1);

      const after = await AppDataSource.getRepository(World).findOneBy({ id: world.id });
      expect(Number(after!.playCount)).to.equal(1);
      expect(after!.updatedAt.toISOString()).to.equal(longAgo.toISOString());
    });

    it("counts a remix without changing the original's updatedAt", async () => {
      const sendForkEmailStub = sinon.stub(email, "sendForkEmail").resolves(true);
      try {
        const { user: owner } = await createTestUser("owner", "password123");
        const world = await makeOldWorld(owner.id);

        const { authHeader: forkerAuth } = await createTestUser("forker", "password123");
        await request(app)
          .post(`/worlds?from=${world.id}&fork=true`)
          .set("Authorization", forkerAuth)
          .expect(200);

        const after = await AppDataSource.getRepository(World).findOneBy({ id: world.id });
        expect(Number(after!.forkCount)).to.equal(1);
        expect(after!.updatedAt.toISOString()).to.equal(longAgo.toISOString());
      } finally {
        sendForkEmailStub.restore();
      }
    });
  });

  describe("POST /worlds", () => {
    it("should return 401 without authentication", async () => {
      await request(app).post("/worlds").expect(401);
    });

    it("should create a new world with authentication", async () => {
      const { authHeader } = await createTestUser("testuser", "password123");

      const res = await request(app).post("/worlds").set("Authorization", authHeader).expect(200);

      expect(res.body.name).to.equal("Untitled");
      expect(res.body.id).to.be.a("number");
    });

    it("won't copy an unpublished world someone else made", async () => {
      const { user: owner, authHeader: ownerAuth } = await createTestUser("owner", "password123");
      const { authHeader: otherAuth } = await createTestUser("other", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Secret World",
        thumbnail: "#",
        userId: owner.id,
        published: false,
      });

      await request(app)
        .post(`/worlds?from=${world.id}&fork=true`)
        .set("Authorization", otherAuth)
        .expect(404);
      await request(app)
        .post(`/worlds?from=${world.id}`)
        .set("Authorization", otherAuth)
        .expect(404);

      // The owner can still duplicate their own.
      const copy = await request(app)
        .post(`/worlds?from=${world.id}`)
        .set("Authorization", ownerAuth)
        .expect(200);
      expect(copy.body.name).to.equal("Secret World");
    });

    it("should send fork email when forking a world", async () => {
      const sendForkEmailStub = sinon.stub(email, "sendForkEmail").resolves(true);

      try {
        // Create owner with email and fork notifications enabled
        const { user: owner } = await createTestUser("owner", "password123");
        await AppDataSource.getRepository(User).update(owner.id, {
          email: "owner@example.com",
          notificationSettings: { announcements: true, forks: true, playSummaries: true },
        });

        // Create a world owned by owner
        const world = await saveWorld({
          name: "Original World",
          thumbnail: "#",
          userId: owner.id,
          published: true,
        });

        // Fork the world as a different user
        const { authHeader: forkerAuth } = await createTestUser("forker", "password123");
        await request(app)
          .post(`/worlds?from=${world.id}&fork=true`)
          .set("Authorization", forkerAuth)
          .expect(200);

        // Verify sendForkEmail was called with correct data
        expect(sendForkEmailStub.calledOnce).to.be.true;
        const [recipient, data] = sendForkEmailStub.firstCall.args;
        expect(recipient.email).to.equal("owner@example.com");
        expect(recipient.username).to.equal("owner");
        expect(data.forkerUsername).to.equal("forker");
        expect(data.worldName).to.equal("Original World");
        expect(data.worldId).to.equal(world.id);
      } finally {
        sendForkEmailStub.restore();
      }
    });

    it("should not send fork email when owner has forks notifications disabled", async () => {
      const sendForkEmailStub = sinon.stub(email, "sendForkEmail").resolves(true);

      try {
        // Create owner with forks notifications disabled
        const { user: owner } = await createTestUser("owner", "password123");
        await AppDataSource.getRepository(User).update(owner.id, {
          email: "owner@example.com",
          notificationSettings: { announcements: true, forks: false, playSummaries: true },
        });

        // Create a world owned by owner
        const world = await saveWorld({
          name: "Original World",
          thumbnail: "#",
          userId: owner.id,
          published: true,
        });

        // Fork the world as a different user
        const { authHeader: forkerAuth } = await createTestUser("forker", "password123");
        await request(app)
          .post(`/worlds?from=${world.id}&fork=true`)
          .set("Authorization", forkerAuth)
          .expect(200);

        // Verify sendForkEmail was NOT called
        expect(sendForkEmailStub.called).to.be.false;
      } finally {
        sendForkEmailStub.restore();
      }
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

  describe("GET /worlds?user=<username>", () => {
    it("lists only published worlds to anyone but the owner", async () => {
      const { user, authHeader } = await createTestUser("maker", "password123");
      const { authHeader: otherAuth } = await createTestUser("other", "password123");
      await saveWorlds([
        { name: "Shown", thumbnail: "#", userId: user.id, published: true },
        { name: "Hidden", thumbnail: "#", userId: user.id, published: false },
      ]);
      const names = (res: request.Response) => res.body.map((w: { name: string }) => w.name);

      const anon = await request(app).get("/worlds?user=maker").expect(200);
      expect(names(anon)).to.deep.equal(["Shown"]);

      const other = await request(app)
        .get("/worlds?user=maker")
        .set("Authorization", otherAuth)
        .expect(200);
      expect(names(other)).to.deep.equal(["Shown"]);

      const mine = await request(app)
        .get("/worlds?user=maker")
        .set("Authorization", authHeader)
        .expect(200);
      expect(names(mine)).to.have.members(["Shown", "Hidden"]);
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
        .put(`/worlds/${world.id}?action=save`)
        .set("Authorization", authHeader)
        .send({ name: "Updated Name", data: { updated: true } })
        .expect(200);

      expect(res.body.name).to.equal("Updated Name");
      expect(res.body.data).to.deep.equal({ updated: true });
    });

    it("should not change the thumbnail on a draft save", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Original Name",
        thumbnail: "saved-thumbnail",
        userId: user.id,
      });

      // A draft save (default action) carries the in-progress thumbnail, but it
      // must not overwrite the committed thumbnail shown on the world card.
      await request(app)
        .put(`/worlds/${world.id}?action=saveDraft`)
        .set("Authorization", authHeader)
        .send({ thumbnail: "draft-thumbnail", data: { draft: true } })
        .expect(200);

      const afterDraft = await worldRepo.findOneByOrFail({ id: world.id });
      expect(afterDraft.thumbnail).to.equal("saved-thumbnail");

      // An explicit save should update the thumbnail.
      await request(app)
        .put(`/worlds/${world.id}?action=save`)
        .set("Authorization", authHeader)
        .send({ thumbnail: "committed-thumbnail", data: { saved: true } })
        .expect(200);

      const afterSave = await worldRepo.findOneByOrFail({ id: world.id });
      expect(afterSave.thumbnail).to.equal("committed-thumbnail");
    });

    it("should delete the world on discard when it was never committed", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Untitled",
        thumbnail: "#",
        userId: user.id,
        data: null,
        unsavedData: { draft: true },
        unsavedDataUpdatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/worlds/${world.id}?action=discard`)
        .set("Authorization", authHeader)
        .send({})
        .expect(200);

      expect(res.body.deleted).to.equal(true);
      const deleted = await worldRepo.findOneBy({ id: world.id });
      expect(deleted).to.be.null;
    });

    it("should keep the world on discard when it has committed data", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const worldRepo = AppDataSource.getRepository(World);
      const world = await worldRepo.save({
        name: "Saved World",
        thumbnail: "#",
        userId: user.id,
        data: { saved: true },
        unsavedData: { draft: true },
        unsavedDataUpdatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/worlds/${world.id}?action=discard`)
        .set("Authorization", authHeader)
        .send({})
        .expect(200);

      expect(res.body.deleted).to.be.undefined;
      const remaining = await worldRepo.findOneByOrFail({ id: world.id });
      expect(remaining.data).to.deep.equal({ saved: true });
      expect(remaining.unsavedData).to.be.null;
      expect(remaining.unsavedDataUpdatedAt).to.be.null;
    });

    it("should clear the description when the request sends null", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Described",
        thumbnail: "#",
        userId: user.id,
        description: "Use the arrow keys",
      });

      await request(app)
        .put(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .send({ name: "Described", description: null })
        .expect(200);

      const updated = await AppDataSource.getRepository(World).findOneBy({ id: world.id });
      expect(updated!.description).to.equal(null);
    });

    it("should keep the description when the request leaves it out", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Described",
        thumbnail: "#",
        userId: user.id,
        description: "Use the arrow keys",
      });

      await request(app)
        .put(`/worlds/${world.id}?action=save`)
        .set("Authorization", authHeader)
        .send({ data: { stages: {} } })
        .expect(200);

      const updated = await AppDataSource.getRepository(World).findOneBy({ id: world.id });
      expect(updated!.description).to.equal("Use the arrow keys");
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

      await request(app).delete(`/worlds/${world.id}`).set("Authorization", authHeader).expect(200);

      const deletedWorld = await worldRepo.findOneBy({ id: world.id });
      expect(deletedWorld).to.be.null;
    });
  });

  // Players get the version the author last published, not whatever the author
  // has saved since.
  describe("published versions", () => {
    async function publishedGame() {
      const { user, authHeader } = await createTestUser("maker", "password123");
      const { authHeader: otherAuth } = await createTestUser("player", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Untitled",
        thumbnail: "#",
        userId: user.id,
      });
      await request(app)
        .put(`/worlds/${world.id}?action=save`)
        .set("Authorization", authHeader)
        .send({ data: { v: 1 }, thumbnail: "picture-1" })
        .expect(200);
      await request(app)
        .post(`/worlds/${world.id}/publish`)
        .set("Authorization", authHeader)
        .send({ name: "Maze", description: "Find the exit" })
        .expect(200);
      return { world, authHeader, otherAuth };
    }

    async function saveNewVersion(id: number, authHeader: string) {
      await request(app)
        .put(`/worlds/${id}?action=save`)
        .set("Authorization", authHeader)
        .send({ data: { v: 2 }, name: "Maze 2", description: "Harder", thumbnail: "picture-2" })
        .expect(200);
    }

    it("keeps showing players the published version after the author saves", async () => {
      const { world, authHeader, otherAuth } = await publishedGame();
      await saveNewVersion(world.id, authHeader);

      const anon = await request(app).get(`/worlds/${world.id}`).expect(200);
      expect(anon.body).to.include({
        name: "Maze",
        description: "Find the exit",
        thumbnail: "picture-1",
        published: true,
      });
      expect(anon.body.data).to.deep.equal({ v: 1 });

      const other = await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", otherAuth)
        .expect(200);
      expect(other.body.data).to.deep.equal({ v: 1 });

      const explore = await request(app).get("/worlds/explore").expect(200);
      expect(explore.body[0]).to.include({ name: "Maze", thumbnail: "picture-1" });
      const found = await request(app).get("/worlds/explore").query({ q: "maze 2" }).expect(200);
      expect(found.body).to.have.length(0);

      const profile = await request(app).get("/worlds?user=maker").expect(200);
      expect(profile.body[0].name).to.equal("Maze");

      // The author works on what they saved.
      const mine = await request(app)
        .get(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .expect(200);
      expect(mine.body).to.include({ name: "Maze 2", thumbnail: "picture-2" });
      expect(mine.body.data).to.deep.equal({ v: 2 });
      expect(mine.body.publishedAt).to.be.a("string");
    });

    it("shows players the new version once the author publishes again", async () => {
      const { world, authHeader } = await publishedGame();
      await saveNewVersion(world.id, authHeader);
      await request(app)
        .post(`/worlds/${world.id}/publish`)
        .set("Authorization", authHeader)
        .send({ name: "Maze 2", description: "Harder" })
        .expect(200);

      const anon = await request(app).get(`/worlds/${world.id}`).expect(200);
      expect(anon.body).to.include({
        name: "Maze 2",
        description: "Harder",
        thumbnail: "picture-2",
      });
      expect(anon.body.data).to.deep.equal({ v: 2 });
      expect(
        await AppDataSource.getRepository(WorldVersion).countBy({ worldId: world.id }),
      ).to.equal(2);
    });

    it("copies the published version when someone remixes it", async () => {
      const sendForkEmailStub = sinon.stub(email, "sendForkEmail").resolves(true);
      try {
        const { world, authHeader, otherAuth } = await publishedGame();
        await saveNewVersion(world.id, authHeader);

        const remix = await request(app)
          .post(`/worlds?from=${world.id}&fork=true`)
          .set("Authorization", otherAuth)
          .expect(200);
        const copy = await AppDataSource.getRepository(World).findOneByOrFail({
          id: remix.body.id,
        });
        expect(copy).to.include({ name: "Maze", thumbnail: "picture-1" });
        expect(copy.data).to.deep.equal({ v: 1 });

        // The author duplicating their own game copies what they saved.
        const duplicate = await request(app)
          .post(`/worlds?from=${world.id}`)
          .set("Authorization", authHeader)
          .expect(200);
        const mine = await AppDataSource.getRepository(World).findOneByOrFail({
          id: duplicate.body.id,
        });
        expect(mine.data).to.deep.equal({ v: 2 });
      } finally {
        sendForkEmailStub.restore();
      }
    });

    it("takes an unpublished game off the Public Games page and keeps its versions", async () => {
      const { world, authHeader } = await publishedGame();
      const res = await request(app)
        .delete(`/worlds/${world.id}/publish`)
        .set("Authorization", authHeader)
        .expect(200);
      expect(res.body.published).to.equal(false);

      const explore = await request(app).get("/worlds/explore").expect(200);
      expect(explore.body).to.have.length(0);
      await request(app).get(`/worlds/${world.id}`).expect(404);
      expect(
        await AppDataSource.getRepository(WorldVersion).countBy({ worldId: world.id }),
      ).to.equal(1);
    });

    it("won't publish or unpublish from a save", async () => {
      const { world, authHeader } = await publishedGame();
      await request(app)
        .put(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .send({ data: { v: 2 }, published: false })
        .expect(200);
      await request(app)
        .put(`/worlds/${world.id}?action=save`)
        .set("Authorization", authHeader)
        .send({ data: { v: 2 }, published: false })
        .expect(200);
      await request(app).get(`/worlds/${world.id}`).expect(200);

      const { user, authHeader: otherAuth } = await createTestUser("other", "password123");
      const unpublished = await AppDataSource.getRepository(World).save({
        name: "Secret",
        thumbnail: "#",
        userId: user.id,
        data: { v: 1 },
      });
      await request(app)
        .put(`/worlds/${unpublished.id}?action=save`)
        .set("Authorization", otherAuth)
        .send({ data: { v: 1 }, published: true })
        .expect(200);
      await request(app).get(`/worlds/${unpublished.id}`).expect(404);
    });

    it("updates the published title and description from the play page", async () => {
      const { world, authHeader } = await publishedGame();
      await saveNewVersion(world.id, authHeader);
      await request(app)
        .put(`/worlds/${world.id}`)
        .set("Authorization", authHeader)
        .send({ name: "Labyrinth", description: null })
        .expect(200);

      const anon = await request(app).get(`/worlds/${world.id}`).expect(200);
      expect(anon.body).to.include({ name: "Labyrinth", description: null });
      // The game itself stays as it was published.
      expect(anon.body.data).to.deep.equal({ v: 1 });
    });

    it("won't publish a game that was never saved, or someone else's", async () => {
      const { user, authHeader } = await createTestUser("maker", "password123");
      const { authHeader: otherAuth } = await createTestUser("other", "password123");
      const world = await AppDataSource.getRepository(World).save({
        name: "Untitled",
        thumbnail: "#",
        userId: user.id,
        data: null,
      });

      await request(app)
        .post(`/worlds/${world.id}/publish`)
        .set("Authorization", authHeader)
        .send({ name: "Empty" })
        .expect(400);
      await request(app)
        .post(`/worlds/${world.id}/publish`)
        .set("Authorization", otherAuth)
        .send({ name: "Mine now" })
        .expect(404);
      await request(app)
        .delete(`/worlds/${world.id}/publish`)
        .set("Authorization", otherAuth)
        .expect(404);
      await request(app).post(`/worlds/${world.id}/publish`).expect(401);
    });

    it("deletes a published game along with its versions", async () => {
      const { world, authHeader } = await publishedGame();
      await request(app).delete(`/worlds/${world.id}`).set("Authorization", authHeader).expect(200);
      expect(
        await AppDataSource.getRepository(WorldVersion).countBy({ worldId: world.id }),
      ).to.equal(0);
    });

    it("gives every game published before versions existed a published version", async () => {
      const { user } = await createTestUser("maker", "password123");
      const worldRepo = AppDataSource.getRepository(World);
      const [published, neverSaved, unpublished] = await worldRepo.save([
        { name: "Old Hit", thumbnail: "pic", userId: user.id, data: { v: 1 }, published: true },
        { name: "Blank", thumbnail: "#", userId: user.id, data: null, published: true },
        { name: "Draft", thumbnail: "#", userId: user.id, data: { v: 1 }, published: false },
      ]);

      const migration = new AddWorldVersions1794400000000();
      const queryRunner = AppDataSource.createQueryRunner();
      try {
        await migration.down(queryRunner);
        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }

      const anon = await request(app).get(`/worlds/${published.id}`).expect(200);
      expect(anon.body).to.include({ name: "Old Hit", thumbnail: "pic", published: true });
      expect(anon.body.data).to.deep.equal({ v: 1 });
      await request(app).get(`/worlds/${neverSaved.id}`).expect(404);
      await request(app).get(`/worlds/${unpublished.id}`).expect(404);
      expect((await worldRepo.findOneByOrFail({ id: neverSaved.id })).published).to.equal(false);
    });
  });
});
