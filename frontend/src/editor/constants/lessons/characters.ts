import { Actor, Stage } from "../../../types";

/**
 * Character ids in the worlds the lessons start from
 * (frontend/src/lessons/worlds, built by scripts/build-lesson-worlds.ts).
 * They match the original Cave Adventure tutorial world, which is where the
 * lesson worlds' character library came from.
 */
export const LESSON_CHARACTER_IDS = {
  hero: "aamlcui8uxr",
  boulder: "oou4u6jemi",
  bird: "bird",
  horse: "horse",
};

/** Actor ids the lesson worlds give the characters lessons reposition. */
export const heroPath = { worldId: "root", stageId: "root", actorIds: ["hero"] };
export const boulderPath = { worldId: "root", stageId: "root", actorIds: ["boulder"] };
export const birdPath = { worldId: "root", stageId: "root", actorIds: ["bird"] };
/** The three horses in the race, one per lane. */
export const horsePaths = ["horse-1", "horse-2", "horse-3"].map((id) => ({
  worldId: "root",
  stageId: "root",
  actorIds: [id],
}));

export const heroIn = (stage: Stage): Actor | undefined =>
  Object.values(stage.actors).find((a) => a.characterId === LESSON_CHARACTER_IDS.hero);

export const boulderIn = (stage: Stage): Actor | undefined =>
  Object.values(stage.actors).find((a) => a.characterId === LESSON_CHARACTER_IDS.boulder);

export const birdIn = (stage: Stage): Actor | undefined =>
  Object.values(stage.actors).find((a) => a.characterId === LESSON_CHARACTER_IDS.bird);

export const horsesIn = (stage: Stage): Actor[] =>
  Object.values(stage.actors).filter((a) => a.characterId === LESSON_CHARACTER_IDS.horse);
