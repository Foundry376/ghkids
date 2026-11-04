import { expect } from "chai";
import crypto from "node:crypto";
import request from "supertest";
import app from "../app";
import { AppDataSource } from "../db/data-source";
import { Session } from "../db/entity/session";
import { User } from "../db/entity/user";
import { createTestUser } from "./helpers";
import { resetDatabase } from "./setup";

const ONE_DAY = 24 * 60 * 60 * 1000;

const setCookies = (res: request.Response) =>
  (res.headers["set-cookie"] ?? []) as unknown as string[];
const cookieNamed = (res: request.Response, name: string) =>
  setCookies(res).find((c) => c.startsWith(`${name}=`));
const tokenFrom = (res: request.Response) =>
  /^codako_session=([^;]+)/.exec(cookieNamed(res, "codako_session") ?? "")?.[1] ?? "";

describe("Sessions", () => {
  const sessions = () => AppDataSource.getRepository(Session);

  beforeEach(async () => {
    await resetDatabase();
  });

  async function signIn(username = "kid", password = "password123") {
    const { user, authHeader } = await createTestUser(username, password);
    const agent = request.agent(app);
    const res = await agent.post("/sessions").set("Authorization", authHeader).expect(200);
    return { user, authHeader, agent, res };
  }

  describe("POST /sessions", () => {
    it("sets a session cookie scripts can't read, and a profile cookie they can", async () => {
      const { user, res } = await signIn();

      expect(res.body).to.deep.equal({ id: user.id, username: "kid" });
      const session = cookieNamed(res, "codako_session");
      expect(session).to.match(/HttpOnly/);
      expect(session).to.match(/SameSite=Lax/);
      expect(session).to.match(/Max-Age=31536000/);

      const profile = cookieNamed(res, "session");
      expect(profile).to.not.match(/HttpOnly/);
      expect(profile).to.match(/Max-Age=31536000/);
      const value = decodeURIComponent(/^session=([^;]+)/.exec(profile ?? "")?.[1] ?? "");
      expect(JSON.parse(value)).to.deep.equal({ me: { id: user.id, username: "kid" } });
    });

    it("marks both cookies Secure in production", async () => {
      const { authHeader } = await createTestUser("kid", "password123");
      const nodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const res = await request(app).post("/sessions").set("Authorization", authHeader);
        expect(cookieNamed(res, "codako_session")).to.match(/; Secure/);
        expect(cookieNamed(res, "session")).to.match(/; Secure/);
      } finally {
        process.env.NODE_ENV = nodeEnv;
      }
    });

    it("stores only a hash of the token", async () => {
      const { res } = await signIn();
      const token = tokenFrom(res);
      const [stored] = await sessions().find();

      expect(stored.tokenHash).to.not.equal(token);
      expect(stored.tokenHash).to.equal(crypto.createHash("sha256").update(token).digest("hex"));
    });

    it("rejects a wrong password without setting a cookie", async () => {
      await createTestUser("kid", "password123");
      const wrong = `Basic ${Buffer.from("kid:nope").toString("base64")}`;

      const res = await request(app).post("/sessions").set("Authorization", wrong).expect(403);
      expect(res.body.message).to.include("password");
      expect(setCookies(res)).to.deep.equal([]);
      expect(await sessions().count()).to.equal(0);
    });

    it("needs credentials", async () => {
      await request(app).post("/sessions").expect(401);
    });

    it("clears out this user's expired sessions", async () => {
      const { user, authHeader } = await signIn();
      await sessions().update(
        { userId: String(user.id) },
        { expiresAt: new Date(Date.now() - 1000) },
      );

      await request(app).post("/sessions").set("Authorization", authHeader).expect(200);
      expect(await sessions().count()).to.equal(1);
    });
  });

  describe("using a session", () => {
    it("signs requests in without any credentials", async () => {
      const { user, agent } = await signIn();

      const res = await agent.get("/users/me").expect(200);
      expect(res.body.id).to.equal(user.id);
      await agent.get("/worlds?user=me").expect(200);
    });

    it("still accepts Basic auth", async () => {
      const { user, authHeader } = await createTestUser("kid", "password123");

      const res = await request(app).get("/users/me").set("Authorization", authHeader).expect(200);
      expect(res.body.id).to.equal(user.id);
    });

    it("rejects an unknown token on account routes, and ignores it on public ones", async () => {
      const cookie = "codako_session=made-up";

      await request(app).get("/users/me").set("Cookie", cookie).expect(403);
      await request(app).get("/worlds/explore").set("Cookie", cookie).expect(200);
    });

    it("rejects an expired session", async () => {
      const { user, agent } = await signIn();
      await sessions().update(
        { userId: String(user.id) },
        { expiresAt: new Date(Date.now() - 1000) },
      );

      await agent.get("/users/me").expect(403);
    });

    it("rejects a session whose account is gone", async () => {
      const { user, agent } = await signIn();
      await AppDataSource.getRepository(User).delete({ id: user.id });

      await agent.get("/users/me").expect(403);
    });

    it("restarts the year once the session is a day old", async () => {
      const { user, res } = await signIn();
      const cookie = `codako_session=${tokenFrom(res)}`;
      const inSixMonths = new Date(Date.now() + 180 * ONE_DAY);
      await sessions().update({ userId: String(user.id) }, { expiresAt: inSixMonths });

      const renewed = await request(app).get("/users/me").set("Cookie", cookie).expect(200);
      expect(cookieNamed(renewed, "codako_session")).to.match(/Max-Age=31536000/);
      expect(cookieNamed(renewed, "session")).to.match(/Max-Age=31536000/);
      const [stored] = await sessions().find();
      expect(stored.expiresAt.getTime()).to.be.greaterThan(Date.now() + 364 * ONE_DAY);
    });

    it("leaves a fresh session alone", async () => {
      const { res } = await signIn();
      const cookie = `codako_session=${tokenFrom(res)}`;

      const again = await request(app).get("/users/me").set("Cookie", cookie).expect(200);
      expect(setCookies(again)).to.deep.equal([]);
    });
  });

  describe("signing out", () => {
    it("ends this session and clears both cookies", async () => {
      const { agent } = await signIn();

      const res = await agent.delete("/sessions/current").expect(200);
      expect(cookieNamed(res, "codako_session")).to.match(/Expires=Thu, 01 Jan 1970/);
      expect(cookieNamed(res, "session")).to.match(/Expires=Thu, 01 Jan 1970/);
      expect(await sessions().count()).to.equal(0);
      await agent.get("/users/me").expect(401);
    });

    it("leaves the user's other browsers signed in", async () => {
      const { agent, authHeader } = await signIn();
      const other = request.agent(app);
      await other.post("/sessions").set("Authorization", authHeader).expect(200);

      await agent.delete("/sessions/current").expect(200);
      await other.get("/users/me").expect(200);
    });
  });

  describe("signing up", () => {
    it("starts a session", async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/users")
        .send({ username: "newkid", email: "new@example.com", password: "password123" })
        .expect(200);

      expect(res.body.username).to.equal("newkid");
      await agent.get("/users/me").expect(200);
    });
  });

  describe("resetting a password", () => {
    it("signs the user out everywhere", async () => {
      const { user, agent } = await signIn();
      await AppDataSource.getRepository(User).update(user.id, {
        passwordResetToken: "reset-token",
        passwordResetExpiry: new Date(Date.now() + ONE_DAY),
      });

      await request(app)
        .post("/users/reset-password")
        .send({ token: "reset-token", password: "newpassword" })
        .expect(200);

      expect(await sessions().count()).to.equal(0);
      await agent.get("/users/me").expect(403);
    });
  });

  describe("CORS", () => {
    const credentialsAllowed = async (origin: string) => {
      const res = await request(app).get("/worlds/explore").set("Origin", origin).expect(200);
      return res.headers["access-control-allow-credentials"] === "true";
    };

    it("only lets our own pages make requests with a session", async () => {
      expect(await credentialsAllowed("https://www.codako.org")).to.equal(true);
      expect(await credentialsAllowed("https://staging.codako.org")).to.equal(true);
      expect(await credentialsAllowed("https://evil.example")).to.equal(false);
      expect(await credentialsAllowed("https://www.codako.org.evil.example")).to.equal(false);
    });

    it("still lets anyone read public data", async () => {
      const res = await request(app)
        .get("/worlds/explore")
        .set("Origin", "https://evil.example")
        .expect(200);
      expect(res.headers["access-control-allow-origin"]).to.equal("https://evil.example");
    });
  });
});
