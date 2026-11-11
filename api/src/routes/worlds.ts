import express from "express";
import { IsNull, Not } from "typeorm";
import { sendForkEmail } from "src/connectors/email";
import { AppDataSource } from "src/db/data-source";
import { DEFAULT_NOTIFICATION_SETTINGS, User } from "src/db/entity/user";
import { World } from "src/db/entity/world";
import { WorldVersion } from "src/db/entity/world-version";
import { optionalUserFromAuth, userFromAuth } from "src/middleware";

const router = express.Router();

function isOwner(world: World, user: User | undefined | null) {
  return !!user && String(world.userId) === String(user.id);
}

/**
 * A game nobody has published is private to the person who made it: the
 * privacy policy and terms promise that. The tutorial is the one exception -
 * everyone starts from it, published or not.
 */
function canView(world: World, user: User | undefined | null) {
  return (
    world.isPublished() ||
    isOwner(world, user) ||
    String(world.id) === String(process.env.TUTORIAL_WORLD_ID)
  );
}

/**
 * Whether the viewer gets the published version rather than the author's
 * working copy: everyone but the author does, once there is one.
 */
function seesPublished(world: World, user: User | undefined | null) {
  return world.isPublished() && !isOwner(world, user);
}

/** What lists of games load: the published version's title and picture, but not its game. */
const LIST_RELATIONS = ["user", "forkParent", "forkParent.publishedVersion", "publishedVersion"];

/**
 * A world as the viewer may see it. A published remix of a game that isn't
 * published (or stopped being) mustn't show that game's name, thumbnail,
 * description or author, so its "remixed from" is left off.
 */
function serializeFor(
  world: World,
  user: User | undefined | null,
  asPublished = seesPublished(world, user),
) {
  const json = world.serialize(asPublished);
  if (world.forkParent && !canView(world.forkParent, user)) {
    json.forkParent = null;
  }
  return json;
}

/** The published version with its game, which lists of games leave out. */
function publishedVersionWithData(world: World) {
  return AppDataSource.getRepository(WorldVersion)
    .createQueryBuilder("version")
    .addSelect("version.data")
    .where("version.id = :id", { id: world.publishedVersionId })
    .getOneOrFail();
}

const EXPLORE_PAGE_SIZE = 24;
const EXPLORE_MAX_PAGE_SIZE = 60;

/**
 * Published games, most played first. Pages through with `offset` and `limit`
 * (the Public Games page asks for more as you go), and `q` narrows it to
 * games whose title or author's username contains it.
 */
router.get("/worlds/explore", optionalUserFromAuth, async (req, res) => {
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
    .leftJoinAndSelect("forkParent.publishedVersion", "forkParentVersion")
    .innerJoinAndSelect("world.publishedVersion", "version");
  if (q) {
    // Match the text literally: % and _ in a search mean themselves.
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    query.andWhere("(version.name ILIKE :pattern OR user.username ILIKE :pattern)", { pattern });
  }
  const worlds = await query
    .orderBy("world.playCount", "DESC")
    .addOrderBy("world.id", "DESC")
    .skip(offset)
    .take(limit)
    .getMany();
  // Authors see their own games here as everyone else does: as published.
  res.json(worlds.map((w) => serializeFor(w, req.user, true)));
});

/**
 * Count a play or a remix. These are other people's doing - they don't change
 * the game - so they leave updatedAt alone; otherwise every play would bump
 * the game to the top of its owner's My Games. (TypeORM sets an
 * @UpdateDateColumn on any save or update unless it's given explicitly.) The
 * increment happens in the database, so two at once can't lose a count.
 */
async function incrementCount(id: number, column: "playCount" | "forkCount") {
  await AppDataSource.getRepository(World)
    .createQueryBuilder()
    .update()
    .set({ [column]: () => `"${column}" + 1`, updatedAt: () => `"updatedAt"` })
    .where("id = :id", { id })
    .execute();
}

router.get("/worlds/:objectId", optionalUserFromAuth, async (req, res) => {
  let objectId = req.params.objectId;
  if (objectId === "tutorial") {
    objectId = process.env.TUTORIAL_WORLD_ID!;
  }
  const world = await AppDataSource.getRepository(World).findOne({
    where: { id: Number(objectId) },
    relations: LIST_RELATIONS,
  });
  // An unpublished game someone else made looks exactly like a missing one,
  // so ids can't be used to find out which games exist.
  if (!world || !canView(world, req.user)) {
    res.status(404).json({ message: "Sorry, this world could not be found." });
    return;
  }

  await incrementCount(world.id, "playCount");
  world.playCount = Number(world.playCount) + 1;

  // The owner gets both data and unsavedData - the editor decides which to use.
  // Anyone else gets the published version: the author's saves and unsaved
  // draft stay private until they publish them.
  res.json(
    Object.assign({}, serializeFor(world, req.user), {
      data: seesPublished(world, req.user)
        ? (await publishedVersionWithData(world)).data
        : world.data,
      unsavedData: isOwner(world, req.user) ? (world.unsavedData ?? null) : null,
    }),
  );
});

// Auth Required:

router.get(
  "/worlds",
  // "My games" is meaningless without a working login, unlike a public profile.
  (req, res, next) =>
    req.query.user === "me" ? userFromAuth(req, res, next) : optionalUserFromAuth(req, res, next),
  async (req, res) => {
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

    // Someone else's list - their profile page - holds only what they've published.
    const owner = !!req.user && String(req.user.id) === String(user.id);
    const worlds = await AppDataSource.getRepository(World).find({
      relations: LIST_RELATIONS,
      where: owner ? { userId: user.id } : { userId: user.id, publishedVersionId: Not(IsNull()) },
    });
    // My Games shows the author's latest saves; a profile shows what's published, even to its owner.
    res.json(worlds.map((w) => serializeFor(w, req.user, req.query.user !== "me")));
  },
);

router.post("/worlds", userFromAuth, async (req, res) => {
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
    // Copying an unpublished game someone else made would hand out a private game.
    if (!sourceWorld || !canView(sourceWorld, req.user)) {
      return res.status(404).json({ message: "Sorry, this world could not be found." });
    }
  }
  if (sourceWorld) {
    // Someone else's published game is copied as it's published, not as its author last saved it.
    const source: Pick<World, "name" | "data" | "thumbnail"> = seesPublished(sourceWorld, req.user)
      ? await publishedVersionWithData(sourceWorld)
      : sourceWorld;
    if (fork) {
      await incrementCount(sourceWorld.id, "forkCount");
      sourceWorld.forkCount = Number(sourceWorld.forkCount) + 1;

      // Send fork notification email to owner
      const owner = sourceWorld.user;
      const notificationSettings = owner?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
      if (owner?.email && notificationSettings.forks) {
        await sendForkEmail(owner, {
          forkerUsername: req.user.username,
          worldName: source.name,
          worldId: sourceWorld.id,
        });
      }
    }
    newWorld = AppDataSource.getRepository(World).create({
      userId: req.user.id,
      name: source.name,
      data: source.data,
      thumbnail: source.thumbnail,
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

router.put("/worlds/:objectId", userFromAuth, async (req, res) => {
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
    world.description = descriptionFrom(req.body, world);
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
    world.description = descriptionFrom(req.body, world);
    // Don't update updatedAt when saving draft

    // No game in the request means the author edited the title and description
    // from the play page, where they're looking at the published version.
    if (!req.body.data && world.publishedVersionId) {
      await AppDataSource.getRepository(WorldVersion).update(world.publishedVersionId, {
        name: world.name,
        description: world.description,
      });
    }
  }

  await AppDataSource.getRepository(World).save(world);

  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data,
      unsavedData: world.unsavedData ?? null,
    }),
  );
});

/**
 * Publish the game as it's saved now, or update the published game to it.
 * Players keep this copy until the author publishes again.
 */
router.post("/worlds/:objectId/publish", userFromAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const world = await AppDataSource.getRepository(World).findOneBy({
    userId: req.user.id,
    id: Number(req.params.objectId),
  });
  if (!world) {
    return res.status(404).json({ message: "No world with that ID exists for that user." });
  }
  if (!world.data) {
    return res.status(400).json({ message: "Save your game before publishing it." });
  }
  world.name = req.body.name || world.name;
  world.description = descriptionFrom(req.body, world);

  const version = await AppDataSource.getRepository(WorldVersion).save({
    worldId: world.id,
    data: world.data,
    name: world.name,
    description: world.description,
    thumbnail: world.thumbnail,
  });
  world.publishedVersionId = version.id;
  world.publishedVersion = version;
  world.published = true;
  await AppDataSource.getRepository(World).save(world);
  res.json(world.serialize());
});

/** Take the game off the Public Games page. Its published versions are kept. */
router.delete("/worlds/:objectId/publish", userFromAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const world = await AppDataSource.getRepository(World).findOneBy({
    userId: req.user.id,
    id: Number(req.params.objectId),
  });
  if (!world) {
    return res.status(404).json({ message: "No world with that ID exists for that user." });
  }
  world.publishedVersionId = null;
  world.published = false;
  await AppDataSource.getRepository(World).save(world);
  res.json(world.serialize());
});

router.delete("/worlds/:objectId", userFromAuth, async (req, res) => {
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
