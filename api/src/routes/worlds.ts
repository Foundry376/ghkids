import express from "express";
import { AppDataSource } from "src/db/data-source";
import { User } from "src/db/entity/user";
import { World } from "src/db/entity/world";
import { userFromBasicAuth } from "src/middleware";

const router = express.Router();

router.get("/worlds/explore", async (req, res) => {
  const worlds = await AppDataSource.getRepository(World).find({
    relations: ["user", "forkParent"],
    order: { playCount: "DESC" },
    take: 50,
  });
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

  world.playCount += 1;
  await AppDataSource.getRepository(World).save(world);

  // Return both data and unsavedData with their timestamps - let frontend decide which to use
  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data ? JSON.parse(world.data) : null,
      unsavedData: world.unsavedData ? JSON.parse(world.unsavedData) : null,
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
    take: 50,
    where: { userId: user.id },
  });
  res.json(worlds.map((w) => w.serialize()));
});

router.post("/worlds", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401);
  }
  const { fork } = req.query;
  let { from } = req.query;

  let sourceWorld: World | null = null;
  let newWorld: World | null = null;
  if (from) {
    if (from === "tutorial") {
      from = process.env.TUTORIAL_WORLD_ID;
    }
    sourceWorld = await AppDataSource.getRepository(World).findOneBy({ id: Number(from) });
  }
  if (sourceWorld) {
    if (fork) {
      sourceWorld.forkCount += 1;
      await AppDataSource.getRepository(World).save(sourceWorld);
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
    // Save: copy unsavedData to data, clear unsavedData and its timestamp
    if (world.unsavedData) {
      world.data = world.unsavedData;
      world.unsavedData = null;
      // Only clear timestamp if column exists (for backward compatibility)
      if ("unsavedDataUpdatedAt" in world) {
        (world as any).unsavedDataUpdatedAt = null;
      }
    } else if (req.body.data) {
      // If no unsavedData but data provided, save directly to data
      world.data = JSON.stringify(req.body.data);
    }
    // Also update name and thumbnail if provided
    world.name = req.body.name || world.name;
    world.thumbnail = req.body.thumbnail || world.thumbnail;
    // updatedAt will be automatically updated by TypeORM
  } else if (action === "discard") {
    // Discard: clear unsavedData and its timestamp
    world.unsavedData = null;
    // Only clear timestamp if column exists (for backward compatibility)
    if ("unsavedDataUpdatedAt" in world) {
      (world as any).unsavedDataUpdatedAt = null;
    }
  } else {
    // Default: saveDraft - save to unsavedData and update its timestamp
    world.name = req.body.name || world.name;
    world.thumbnail = req.body.thumbnail || world.thumbnail;
    if (req.body.data) {
      world.unsavedData = JSON.stringify(req.body.data);
      // Only update timestamp if column exists (for backward compatibility)
      if ("unsavedDataUpdatedAt" in world) {
        (world as any).unsavedDataUpdatedAt = new Date();
      }
    }
    // Don't update updatedAt when saving draft
  }

  await AppDataSource.getRepository(World).save(world);

  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data ? JSON.parse(world.data) : null,
      unsavedData: world.unsavedData ? JSON.parse(world.unsavedData) : null,
    }),
  );
});

router.delete("/worlds/:objectId", async (req, res) => {
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
