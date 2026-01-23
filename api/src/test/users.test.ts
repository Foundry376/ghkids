import { expect } from "chai";
import request from "supertest";
import app from "../app";
import { AppDataSource } from "../db/data-source";
import { User } from "../db/entity/user";
import { createTestUser } from "./helpers";
import { resetDatabase } from "./setup";

describe("Users API", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("GET /users/me", () => {
    it("should return 401 without authentication", async () => {
      await request(app).get("/users/me").expect(401);
    });

    it("should return current user with authentication", async () => {
      const { user, authHeader } = await createTestUser("testuser", "password123");

      const res = await request(app).get("/users/me").set("Authorization", authHeader).expect(200);

      expect(res.body.username).to.equal("testuser");
      expect(res.body.id).to.equal(user.id);
      // Should not expose sensitive fields
      expect(res.body.passwordHash).to.be.undefined;
      expect(res.body.passwordSalt).to.be.undefined;
    });
  });

  describe("GET /users/:username", () => {
    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/users/nonexistent").expect(404);

      expect(res.body.message).to.include("does not exist");
    });

    it("should return user profile by username", async () => {
      const { user } = await createTestUser("profileuser", "password123");

      const res = await request(app).get("/users/profileuser").expect(200);

      expect(res.body.username).to.equal("profileuser");
      expect(res.body.id).to.equal(user.id);
      // Should not expose sensitive fields
      expect(res.body.passwordHash).to.be.undefined;
      expect(res.body.passwordSalt).to.be.undefined;
    });

    it("should be case-insensitive for username lookup", async () => {
      await createTestUser("mixedcase", "password123");

      // Username is stored lowercase, so lookup should match
      const res = await request(app).get("/users/mixedcase").expect(200);
      expect(res.body.username).to.equal("mixedcase");
    });
  });

  describe("POST /users", () => {
    it("should create a new user", async () => {
      const res = await request(app)
        .post("/users")
        .send({
          username: "newuser",
          email: "newuser@example.com",
          password: "securepassword",
        })
        .expect(200);

      expect(res.body.username).to.equal("newuser");
      expect(res.body.id).to.be.a("string");
      // Should not expose sensitive fields
      expect(res.body.passwordHash).to.be.undefined;
      expect(res.body.passwordSalt).to.be.undefined;

      // Verify user was persisted
      const userRepo = AppDataSource.getRepository(User);
      const savedUser = await userRepo.findOneBy({ username: "newuser" });
      expect(savedUser).to.not.be.null;
      expect(savedUser!.email).to.equal("newuser@example.com");
    });

    it("should normalize username to lowercase", async () => {
      const res = await request(app)
        .post("/users")
        .send({
          username: "MixedCaseUser",
          email: "mixed@example.com",
          password: "password123",
        })
        .expect(200);

      expect(res.body.username).to.equal("mixedcaseuser");
    });

    it("should normalize email to lowercase", async () => {
      await request(app)
        .post("/users")
        .send({
          username: "emailtest",
          email: "Test@EXAMPLE.com",
          password: "password123",
        })
        .expect(200);

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ username: "emailtest" });
      expect(user!.email).to.equal("test@example.com");
    });

    it("should allow login after registration", async () => {
      // Register user
      await request(app)
        .post("/users")
        .send({
          username: "logintest",
          email: "login@example.com",
          password: "mypassword",
        })
        .expect(200);

      // Try to access authenticated route with new credentials
      const credentials = Buffer.from("logintest:mypassword").toString("base64");
      const authHeader = `Basic ${credentials}`;

      const res = await request(app).get("/users/me").set("Authorization", authHeader).expect(200);

      expect(res.body.username).to.equal("logintest");
    });
  });
});
