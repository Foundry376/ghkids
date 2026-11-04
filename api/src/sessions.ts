import crypto from "node:crypto";
import express from "express";
import { LessThan } from "typeorm";
import { AppDataSource } from "./db/data-source";
import { Session } from "./db/entity/session";
import { User } from "./db/entity/user";

/** Holds the secret token. Scripts on the page can't read it. */
export const SESSION_COOKIE = "codako_session";

/**
 * Tells the frontend who's signed in, so it can draw the first page without
 * asking. It only holds the public profile and grants nothing. The server sets
 * it because Safari limits cookies written by scripts to 7 days.
 */
const PROFILE_COOKIE = "session";

const ONE_DAY = 24 * 60 * 60 * 1000;
const SESSION_LENGTH = 365 * ONE_DAY;

function cookieOptions(httpOnly: boolean): express.CookieOptions {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function setSessionCookies(res: express.Response, token: string, user: User) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(true), maxAge: SESSION_LENGTH });
  res.cookie(PROFILE_COOKIE, JSON.stringify({ me: user.serialize() }), {
    ...cookieOptions(false),
    maxAge: SESSION_LENGTH,
  });
}

export function clearSessionCookies(res: express.Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(true));
  res.clearCookie(PROFILE_COOKIE, cookieOptions(false));
}

export async function createSession(res: express.Response, user: User) {
  const repo = AppDataSource.getRepository(Session);
  const userId = String(user.id);
  const token = crypto.randomBytes(32).toString("hex");

  await repo.delete({ userId, expiresAt: LessThan(new Date()) });
  await repo.insert({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_LENGTH),
  });
  setSessionCookies(res, token, user);
}

/**
 * The user a session token belongs to, or null if it isn't a live session.
 * Using a session restarts its year, at most once a day to spare the database.
 */
export async function userFromSessionToken(
  token: string,
  res: express.Response,
): Promise<User | null> {
  const repo = AppDataSource.getRepository(Session);
  const tokenHash = hashToken(token);
  const session = await repo.findOneBy({ tokenHash });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const user = await AppDataSource.getRepository(User).findOneBy({ id: session.userId });
  if (!user) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now() + SESSION_LENGTH - ONE_DAY) {
    await repo.update({ tokenHash }, { expiresAt: new Date(Date.now() + SESSION_LENGTH) });
    setSessionCookies(res, token, user);
  }
  return user;
}

/** Ends the session in this browser. */
export async function endSession(req: express.Request, res: express.Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await AppDataSource.getRepository(Session).delete({ tokenHash: hashToken(token) });
  }
  clearSessionCookies(res);
}

/** Signs a user out everywhere, as when their password changes. */
export async function endAllSessions(user: User) {
  await AppDataSource.getRepository(Session).delete({ userId: String(user.id) });
}
