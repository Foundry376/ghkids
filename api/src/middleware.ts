import crypto from "node:crypto";
import express from "express";
import { AppDataSource } from "./db/data-source";
import { User } from "./db/entity/user";

type AuthResult = { user: User | null; error?: undefined } | { user?: undefined; error: string };

/** Reads Basic auth from the request: no header is no user, not an error. */
async function userFromAuthHeader(req: express.Request): Promise<AuthResult> {
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [username, password] = Buffer.from(b64auth, "base64").toString().split(":");

  if (!username) {
    return { user: null };
  }
  const user = await AppDataSource.getRepository(User).findOneBy([
    { username: username },
    { email: username },
  ]);
  if (!user) {
    return { error: `This username does not exist.` };
  }
  const hash = crypto.createHmac("sha512", user.passwordSalt);
  hash.update(password);
  if (user.passwordHash !== hash.digest("hex")) {
    return { error: `The password you entered is incorrect.` };
  }
  return { user };
}

export const userFromBasicAuth = async (
  req: express.Request,
  res: express.Response,
  next: () => void,
) => {
  const { user, error } = await userFromAuthHeader(req);
  if (error) {
    return res.status(401).json({ message: error });
  }
  if (user) {
    req.user = user;
  }
  next();
};

/**
 * For routes anyone can use, where signing in only shows you more (your own
 * unpublished games, say). The frontend sends saved credentials on every
 * request, so a stale password or a deleted account mustn't lock someone out
 * of what they could see signed out: bad credentials count as no credentials.
 */
export const optionalUserFromBasicAuth = async (
  req: express.Request,
  _res: express.Response,
  next: () => void,
) => {
  const { user } = await userFromAuthHeader(req);
  if (user) {
    req.user = user;
  }
  next();
};
