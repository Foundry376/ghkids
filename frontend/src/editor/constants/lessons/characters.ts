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
};

/** Actor ids the lesson worlds give the two characters lessons reposition. */
export const heroPath = { worldId: "root", stageId: "root", actorIds: ["hero"] };
export const boulderPath = { worldId: "root", stageId: "root", actorIds: ["boulder"] };

export const heroIn = (stage: Stage): Actor | undefined =>
  Object.values(stage.actors).find((a) => a.characterId === LESSON_CHARACTER_IDS.hero);

export const boulderIn = (stage: Stage): Actor | undefined =>
  Object.values(stage.actors).find((a) => a.characterId === LESSON_CHARACTER_IDS.boulder);
