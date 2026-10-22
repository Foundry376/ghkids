import { expect } from "chai";
import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../app";
import { createTestUser } from "./helpers";
import { resetDatabase } from "./setup";

describe("Sounds API", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /upload-sound", () => {
    it("should return 401 without authentication", async () => {
      await request(app)
        .post("/upload-sound")
        .attach("sound", Buffer.from("fake"), { filename: "a.mp3", contentType: "audio/mpeg" })
        .expect(401);
    });

    it("should reject files that aren't audio", async () => {
      const { authHeader } = await createTestUser("sounduser", "password123");
      await request(app)
        .post("/upload-sound")
        .set("Authorization", authHeader)
        .attach("sound", Buffer.from("fake"), { filename: "a.txt", contentType: "text/plain" })
        .expect(400);
    });

    it("should store an upload from a signed-in user", async () => {
      const { authHeader } = await createTestUser("sounduser", "password123");
      const previous = process.env.LOCAL_UPLOADS;
      process.env.LOCAL_UPLOADS = "true";
      try {
        const res = await request(app)
          .post("/upload-sound")
          .set("Authorization", authHeader)
          .attach("sound", Buffer.from("fake"), {
            filename: "jump.mp3",
            contentType: "audio/mpeg",
          })
          .expect(200);

        expect(res.body.publicUrl).to.match(/\/storage\/sounds\/.+-jump\.mp3$/);
        const key = res.body.publicUrl.split("/storage/")[1];
        fs.rmSync(path.join(__dirname, "..", "..", "storage", key));
      } finally {
        process.env.LOCAL_UPLOADS = previous;
      }
    });
  });
});
