import crypto from "crypto";
import { AppDataSource } from "../src/db/data-source";
import { User } from "../src/db/entity/user";

/**
 * Creates a test user with the given username and password.
 * Returns the user and the Basic Auth header value.
 */
export async function createTestUser(
  username: string,
  password: string
): Promise<{ user: User; authHeader: string }> {
  const userRepo = AppDataSource.getRepository(User);

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.createHmac("sha512", salt).update(password).digest("hex");

  const user = userRepo.create({
    username,
    passwordHash,
    passwordSalt: salt,
  });

  await userRepo.save(user);

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  const authHeader = `Basic ${credentials}`;

  return { user, authHeader };
}
