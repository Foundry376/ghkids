import crypto from "node:crypto";
import express from "express";
import { AppDataSource } from "./db/data-source";
import { User } from "./db/entity/user";
import { SESSION_COOKIE, userFromSessionToken } from "./sessions";

type AuthResult = { user: User | null; error?: undefined } | { user?: undefined; error: string };

/** Reads Basic auth from the request: no header is no user, not an error. */
export async function userFromAuthHeader(req: express.Request): Promise<AuthResult> {
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

/**
 * The browser signs in with a session cookie. Basic auth still works for the
 * headless runner, and for tabs left open from before sessions existed.
 */
async function authenticate(req: express.Request, res: express.Response): Promise<AuthResult> {
  if (req.headers.authorization) {
    return userFromAuthHeader(req);
  }
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return { user: null };
  }
  const user = await userFromSessionToken(token, res);
  return user ? { user } : { error: `Your session has expired. Please sign in again.` };
}

export const userFromAuth = async (
  req: express.Request,
  res: express.Response,
  next: () => void,
) => {
  const { user, error } = await authenticate(req, res);
  if (error) {
    // 403 means "these credentials were rejected". The frontend asks people to
    // sign in again when it gets one for a saved login, so routes shouldn't
    // send it for anything else. "This needs an account" is a 401.
    return res.status(403).json({ message: error });
  }
  if (user) {
    req.user = user;
  }
  next();
};

/**
 * For routes anyone can use, where signing in only shows you more (your own
 * unpublished games, say). Browsers send their login on every request, so an
 * expired session or a deleted account mustn't lock someone out of what they
 * could see signed out: bad credentials count as no credentials.
 */
export const optionalUserFromAuth = async (
  req: express.Request,
  res: express.Response,
  next: () => void,
) => {
  const { user } = await authenticate(req, res);
  if (user) {
    req.user = user;
  }
  next();
};
