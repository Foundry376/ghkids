import express from "express";
import crypto from "node:crypto";
import { AppDataSource } from "src/db/data-source";
import { User } from "src/db/entity/user";
import { userFromBasicAuth } from "src/middleware";

const router = express.Router();

router.get("/users/me", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  res.json(req.user.serialize());
});

router.get("/users/:username", async (req, res) => {
  const user = await AppDataSource.getRepository(User).findOneBy({ username: req.params.username });
  if (!user) {
    return res.status(404).json({ message: "This user does not exist" });
  }
  res.json(user.serialize());
});

router.post("/users", async (req, res) => {
  const { username, email, password } = req.body;

  const passwordSalt = `${Math.round(new Date().valueOf() * Math.random())}`;
  const hash = crypto.createHmac("sha512", passwordSalt);
  hash.update(password);
  const passwordHash = hash.digest("hex");

  try {
    const user = await AppDataSource.getRepository(User).create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      passwordSalt,
    });
    await AppDataSource.getRepository(User).save(user);
    res.json(user.serialize());
  } catch (err) {
    if (`${err}`.includes("unique constraint")) {
      res.status(400).json({ message: `Sorry, this username or email address is already in use.` });
    } else {
      res.status(400).json({ message: `${err}` });
    }
  }
});

export default router;
