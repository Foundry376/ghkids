import crypto from "crypto";
import { AppDataSource } from "../db/data-source";
import { User } from "../db/entity/user";
import { World } from "../db/entity/world";
import { WorldVersion } from "../db/entity/world-version";

/** Publishes a world the way the app does: its saved game becomes the published version. */
export async function publishWorld(world: World): Promise<World> {
  const version = await AppDataSource.getRepository(WorldVersion).save({
    worldId: world.id,
    data: world.data ?? {},
    name: world.name,
    description: world.description ?? null,
    thumbnail: world.thumbnail,
  });
  await AppDataSource.getRepository(World).update(world.id, {
    publishedVersionId: version.id,
    published: true,
  });
  world.publishedVersionId = version.id;
  return world;
}

/** Saves worlds, publishing the ones marked `published: true`. */
export async function saveWorlds(worlds: Partial<World>[]): Promise<World[]> {
  const saved: World[] = [];
  for (const attrs of worlds) {
    const world = await AppDataSource.getRepository(World).save({ ...attrs, published: false });
    saved.push(attrs.published ? await publishWorld(world) : world);
  }
  return saved;
}

export async function saveWorld(attrs: Partial<World>): Promise<World> {
  return (await saveWorlds([attrs]))[0];
}

/**
 * Creates a test user with the given username and password.
 * Returns the user and the Basic Auth header value.
 */
export async function createTestUser(
  username: string,
  password: string,
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
