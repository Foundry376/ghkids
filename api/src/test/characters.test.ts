import { expect } from "chai";
import request from "supertest";
import app from "../app";

describe("Characters API", () => {
  describe("GET /characters", () => {
    it("should return an array of preset characters", async () => {
      const res = await request(app).get("/characters").expect(200);

      expect(res.body).to.be.an("array");
      expect(res.body.length).to.be.greaterThan(0);
    });

    it("should return characters with required properties", async () => {
      const res = await request(app).get("/characters").expect(200);

      const character = res.body[0];
      expect(character).to.have.property("name");
      expect(character).to.have.property("rules");
      expect(character).to.have.property("variables");
      expect(character).to.have.property("spritesheet");
    });

    it("should return characters with valid spritesheet structure", async () => {
      const res = await request(app).get("/characters").expect(200);

      const character = res.body[0];
      expect(character.spritesheet).to.have.property("width");
      expect(character.spritesheet).to.have.property("appearances");
      expect(character.spritesheet).to.have.property("appearanceNames");
      expect(character.spritesheet.width).to.equal(40);
    });

    it("should return characters with base64 encoded sprites", async () => {
      const res = await request(app).get("/characters").expect(200);

      const character = res.body[0];
      const appearances = character.spritesheet.appearances;
      const firstAppearanceKey = Object.keys(appearances)[0];
      const firstSprite = appearances[firstAppearanceKey][0];

      expect(firstSprite).to.be.a("string");
      expect(firstSprite).to.match(/^data:image\/png;base64,/);
    });
  });
});
