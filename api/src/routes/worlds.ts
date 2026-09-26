import express from "express";
import { sendForkEmail } from "src/connectors/email";
import { AppDataSource } from "src/db/data-source";
import { DEFAULT_NOTIFICATION_SETTINGS, User } from "src/db/entity/user";
import { World } from "src/db/entity/world";
import { userFromBasicAuth } from "src/middleware";

const router = express.Router();

const EXPLORE_PAGE_SIZE = 24;
const EXPLORE_MAX_PAGE_SIZE = 60;

/**
 * Published games, most played first. Pages through with `offset` and `limit`
 * (the Published Games page asks for more as you go), and `q` narrows it to
 * games whose title or author's username contains it.
 */
router.get("/worlds/explore", async (req, res) => {
  const limit = Math.min(
    Math.max(Math.floor(Number(req.query.limit)) || EXPLORE_PAGE_SIZE, 1),
    EXPLORE_MAX_PAGE_SIZE,
  );
  const offset = Math.max(Math.floor(Number(req.query.offset)) || 0, 0);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const query = AppDataSource.getRepository(World)
    .createQueryBuilder("world")
    .leftJoinAndSelect("world.user", "user")
    .leftJoinAndSelect("world.forkParent", "forkParent")
    .where("world.published = true");
  if (q) {
    // Match the text literally: % and _ in a search mean themselves.
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    query.andWhere("(world.name ILIKE :pattern OR user.username ILIKE :pattern)", { pattern });
  }
  const worlds = await query
    .orderBy("world.playCount", "DESC")
    .addOrderBy("world.id", "DESC")
    .skip(offset)
    .take(limit)
    .getMany();
  res.json(worlds.map((w) => w.serialize()));
});

router.get("/worlds/:objectId", async (req, res) => {
  let objectId = req.params.objectId;
  if (objectId === "tutorial") {
    objectId = process.env.TUTORIAL_WORLD_ID!;
  }
  const world = await AppDataSource.getRepository(World).findOne({
    where: { id: Number(objectId) },
    relations: ["user", "forkParent"],
  });
  if (!world) {
    res.status(404).json({ message: "Sorry, this world could not be found." });
    return;
  }

  world.playCount = Number(world.playCount) + 1;
  await AppDataSource.getRepository(World).save(world);

  // Return both data and unsavedData with their timestamps - let frontend decide which to use
  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data,
      unsavedData: world.unsavedData ?? null,
    }),
  );
});

// Auth Required:

router.get("/worlds", userFromBasicAuth, async (req, res) => {
  let user: User | null = null;
  if (req.query.user === "me") {
    if (req.user) {
      user = req.user;
    } else {
      return res.status(404).json({ message: "Sorry, you must sign in." });
    }
  } else {
    user = await AppDataSource.getRepository(User).findOneBy({
      username: req.query.user as string,
    });
  }

  if (!user) {
    return res.status(401).json({ message: "This user does not exist." });
  }

  const worlds = await AppDataSource.getRepository(World).find({
    relations: ["user", "forkParent"],
    where: { userId: user.id },
  });
  res.json(worlds.map((w) => w.serialize()));
});

router.post("/worlds", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const { fork } = req.query;
  let { from } = req.query;

  let sourceWorld: World | null = null;
  let newWorld: World | null = null;
  if (from) {
    if (from === "tutorial") {
      from = process.env.TUTORIAL_WORLD_ID;
    }
    sourceWorld = await AppDataSource.getRepository(World).findOne({
      where: { id: Number(from) },
      relations: ["user"],
    });
  }
  if (sourceWorld) {
    if (fork) {
      sourceWorld.forkCount += 1;
      await AppDataSource.getRepository(World).save(sourceWorld);

      // Send fork notification email to owner
      const owner = sourceWorld.user;
      const notificationSettings = owner?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
      if (owner?.email && notificationSettings.forks) {
        await sendForkEmail(owner, {
          forkerUsername: req.user.username,
          worldName: sourceWorld.name,
          worldId: sourceWorld.id,
        });
      }
    }
    newWorld = AppDataSource.getRepository(World).create({
      userId: req.user.id,
      name: sourceWorld.name,
      data: sourceWorld.data,
      thumbnail: sourceWorld.thumbnail,
      forkParentId: fork ? sourceWorld.id : null,
    });
  } else {
    newWorld = AppDataSource.getRepository(World).create({
      userId: req.user.id,
      name: "Untitled",
      data: null,
      thumbnail: "#",
    });
  }
  await AppDataSource.getRepository(World).save(newWorld);
  res.json(newWorld.serialize());
});

/**
 * A description in the request replaces the saved one - including null, which
 * is how clearing it arrives. One that's left out keeps what's saved: the
 * editor only sends it when it's been changed there.
 */
function descriptionFrom(body: Record<string, unknown>, world: World): string | null {
  return "description" in body ? ((body.description as string | null) ?? null) : world.description;
}

router.put("/worlds/:objectId", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "This user does not exist." });
  }

  const { objectId } = req.params;
  const action = req.query.action as string | undefined; // 'save', 'saveDraft', or 'discard'
  const world = await AppDataSource.getRepository(World).findOneBy({
    userId: req.user.id,
    id: Number(objectId),
  });
  if (!world) {
    res.status(404).json({ message: "No world with that ID exists for that user." });
    return;
  }

  // Handle different save actions
  if (action === "save") {
    // Save: copy unsavedData to data, clear unsavedData and timestamp
    world.data = req.body.data || (world.unsavedData as Record<string, unknown>);
    world.unsavedData = null;
    world.unsavedDataUpdatedAt = null;
    // Also update name and thumbnail if provided
    world.name = req.body.name || world.name;
    world.thumbnail = req.body.thumbnail || world.thumbnail;
    // Allow updating published/description on save
    world.description = descriptionFrom(req.body, world);
    world.published = req.body.published ?? world.published;
    // updatedAt will be automatically updated by TypeORM
  } else if (action === "discard") {
    // Discard: clear unsavedData and timestamp. If the world was never
    // committed (data is still null), remove it entirely so we don't leave a
    // blank "Untitled" row on the user's dashboard.
    world.unsavedData = null;
    world.unsavedDataUpdatedAt = null;
    if (world.data === null) {
      await AppDataSource.getRepository(World).remove(world);
      return res.json({ success: true, deleted: true });
    }
  } else {
    // Default: saveDraft - save to unsavedData and update timestamp.
    // Note: we deliberately do NOT update world.thumbnail here. The thumbnail
    // represents the last committed (saved) state of the world, so it should
    // only change on an explicit "save". Updating it during draft autosaves
    // would make the world card reflect unsaved changes even after the user
    // exits without saving or reverts to the saved version.
    world.name = req.body.name || world.name;
    if (req.body.data) {
      world.unsavedData = req.body.data;
      world.unsavedDataUpdatedAt = new Date();
    }
    // Allow updating published/description during draft save too
    world.description = descriptionFrom(req.body, world);
    world.published = req.body.published ?? world.published;
    // Don't update updatedAt when saving draft
  }

  await AppDataSource.getRepository(World).save(world);

  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data,
      unsavedData: world.unsavedData ?? null,
    }),
  );
});

router.delete("/worlds/:objectId", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const { objectId } = req.params;

  const world = await AppDataSource.getRepository(World).findOneBy({
    userId: req.user.id,
    id: Number(objectId),
  });
  if (!world) {
    res.status(404).json({ message: "No world with that ID exists for that user." });
    return;
  }
  await AppDataSource.getRepository(World).remove(world);
  res.json({ success: true });
});

export default router;
