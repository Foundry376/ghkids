import express from "express";
import crypto from "node:crypto";
import { AppDataSource } from "src/db/data-source";
import { User } from "src/db/entity/user";
import { userFromBasicAuth } from "src/middleware";
import { logger } from "src/logger";

const router = express.Router();

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number; error?: string }> {
  if (!RECAPTCHA_SECRET_KEY) {
    logger.warn("RECAPTCHA_SECRET_KEY not configured, skipping captcha verification");
    return { success: true };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const data = (await response.json()) as RecaptchaResponse;

    if (!data.success) {
      return { success: false, error: `reCAPTCHA verification failed: ${data["error-codes"]?.join(", ") || "unknown error"}` };
    }

    if (data.score !== undefined && data.score < RECAPTCHA_SCORE_THRESHOLD) {
      return { success: false, score: data.score, error: `reCAPTCHA score too low: ${data.score}` };
    }

    return { success: true, score: data.score };
  } catch (err) {
    logger.error(`reCAPTCHA verification error: ${err}`);
    return { success: false, error: "Failed to verify captcha" };
  }
}

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
  const { username, email, password, captchaToken } = req.body;

  // Verify reCAPTCHA token
  const captchaResult = await verifyRecaptcha(captchaToken || "");
  if (!captchaResult.success) {
    logger.warn(`Registration blocked by captcha: ${captchaResult.error}`);
    return res.status(400).json({ message: "Captcha verification failed. Please try again." });
  }

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
