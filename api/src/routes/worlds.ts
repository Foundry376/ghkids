import express from "express";
import { sendForkEmail } from "src/connectors/sendgrid";
import { AppDataSource } from "src/db/data-source";
import { DEFAULT_NOTIFICATION_SETTINGS, User } from "src/db/entity/user";
import { World } from "src/db/entity/world";
import { userFromBasicAuth } from "src/middleware";

const router = express.Router();

router.get("/worlds/explore", async (req, res) => {
  const worlds = await AppDataSource.getRepository(World).find({
    where: { published: true },
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

  world.playCount = Number(world.playCount) + 1;
  await AppDataSource.getRepository(World).save(world);

  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data,
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

router.put("/worlds/:objectId", userFromBasicAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "This user does not exist." });
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
  world.name = req.body.name || world.name;
  world.thumbnail = req.body.thumbnail || world.thumbnail;
  world.data = req.body.data ?? world.data;
  world.description = req.body.description ?? world.description;
  world.published = req.body.published ?? world.published;

  await AppDataSource.getRepository(World).save(world);
  res.json(
    Object.assign({}, world.serialize(), {
      data: world.data,
    }),
  );
});

router.delete("/worlds/:objectId", userFromBasicAuth, async (req, res) => {
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
