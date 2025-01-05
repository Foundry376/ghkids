import crypto from "node:crypto";
import express from "express";
import { AppDataSource } from "./db/data-source";
import { User } from "./db/entity/user";

export const userFromBasicAuth = async (
  req: express.Request,
  res: express.Response,
  next: () => void,
) => {
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [username, password] = Buffer.from(b64auth, "base64").toString().split(":");

  if (username) {
    const user = await AppDataSource.getRepository(User).findOneBy([
      { username: username },
      { email: username },
    ]);
    if (!user) {
      return res.status(401).json({ message: `This username does not exist.` });
    }
    const hash = crypto.createHmac("sha512", user.passwordSalt);
    hash.update(password);
    if (user.passwordHash !== hash.digest("hex")) {
      return res.status(401).json({ message: `The API key you passed is not active.` });
    }
    req.user = user;
  }
  next();
};
