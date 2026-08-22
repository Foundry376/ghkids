/**
 * Build the prebuilt worlds each Learn Codako lesson starts from.
 *
 * Every lesson opens in its own small world instead of the one big "Cave
 * Adventure" world the old tutorial used. The worlds are described here as
 * ASCII maps so a layout change is a one-line diff, and written out as JSON
 * the frontend imports (frontend/src/lessons/worlds/*.json).
 *
 * The character library (Hero, Boulder, Flag, Lava, Dirt with their sprites
 * and rules) is shared by every lesson and lives in lesson-worlds/characters.json;
 * it was lifted from the original tutorial world so the lesson content, which
 * refers to characters by id, keeps working.
 *
 * Usage:
 *   cd scripts && yarn install && yarn build-lesson-worlds
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_FILE = path.resolve(__dirname, "lesson-worlds/characters.json");
const OUT_DIR = path.resolve(__dirname, "../frontend/src/lessons/worlds");

const CHARACTER_IDS = {
  hero: "aamlcui8uxr",
  boulder: "oou4u6jemi",
  flag: "jizye5ng66r",
  lava: "1483692598319",
  dirt: "1483692683990",
};

/** Sprite each map character places, copied from the original tutorial world. */
const TILES: Record<
  string,
  { characterId: string; appearance: string; transform?: string }
> = {
  H: { characterId: CHARACTER_IDS.hero, appearance: "1483692402546" },
  O: { characterId: CHARACTER_IDS.boulder, appearance: "idle" },
  F: { characterId: CHARACTER_IDS.flag, appearance: "ax1" },
  "=": { characterId: CHARACTER_IDS.dirt, appearance: "1490493932180" }, // grassy top
  "#": { characterId: CHARACTER_IDS.dirt, appearance: "idle" },
  "~": { characterId: CHARACTER_IDS.lava, appearance: "idle" }, // surface 1
  "-": { characterId: CHARACTER_IDS.lava, appearance: "1483692615578" }, // surface 2
  _: { characterId: CHARACTER_IDS.lava, appearance: "1483692635012" }, // deep
};

/** Actors that lesson content moves around get a readable id instead of a timestamp. */
const NAMED_IDS: Record<string, string> = {
  H: "hero",
  O: "boulder",
  F: "flag",
};

type LessonWorld = {
  slug: string;
  /** Rows top to bottom; row length sets the stage width, row count the height. */
  map: string[];
  /** Rules to add to a character before the lesson starts. */
  prebuiltRules?: { characterId: string; rules: unknown[] };
};

/**
 * The climb rule lesson 4 starts from: the kid recorded it in lesson 3, so
 * "event-blocks" opens with it already in the hero's idle container - which is
 * where the recorder puts a newly recorded rule (see characters-reducer).
 */
const climbRule = {
  id: "rule-climb-a-boulder",
  name: "Untitled Rule",
  type: "rule",
  actors: {
    hero: {
      id: "hero",
      position: { x: 0, y: 0 },
      appearance: "1483692402546",
      characterId: CHARACTER_IDS.hero,
      variableValues: {},
    },
    boulder: {
      id: "boulder",
      position: { x: 1, y: 0 },
      appearance: "idle",
      characterId: CHARACTER_IDS.boulder,
      variableValues: {},
    },
  },
  extent: { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ignored: {} },
  actions: [{ type: "move", delta: { x: 1, y: 1 }, actorId: "hero" }],
  conditions: [],
  mainActorId: "hero",
};

/**
 * Lessons 1 and 2 share a world: lesson 1 only plays it, so lesson 2 starts
 * from the same picture the kid was looking at when lesson 1 ended.
 *
 * The lava pit starts one square left of the gap in the ground on purpose.
 * The hero's "if dead, move to the left edge" rule looks for lava beside him
 * and dirt above it, so falling in puts him back on the ledge to try again.
 */
const bridgeMap = [
  "..............",
  "..............",
  "..............",
  "..............",
  ".H..........F.",
  "====.....=====",
  "###~-~-~-#####",
  "###______#####",
];

/** Lessons 3 and 4: flat ground, one boulder in the way, exit past it. */
const boulderMap = [
  "..............",
  "..............",
  "..............",
  "..............",
  ".H.......O..F.",
  "==============",
  "##############",
  "##############",
];

/** Lesson 5: the boulder waits on a ledge over the path to the exit. */
const ledgeMap = [
  "..............",
  "..............",
  "..........O...",
  "..........====",
  "..........####",
  ".H..........F.",
  "==============",
  "##############",
  "##############",
];

const LESSON_WORLDS: LessonWorld[] = [
  { slug: "playback", map: bridgeMap },
  { slug: "draw-a-character", map: bridgeMap },
  { slug: "record-a-rule", map: boulderMap },
  {
    slug: "event-blocks",
    map: boulderMap,
    prebuiltRules: { characterId: CHARACTER_IDS.hero, rules: [climbRule] },
  },
  { slug: "falling-boulder", map: ledgeMap },
];

type Actor = {
  id: string;
  position: { x: number; y: number };
  appearance: string;
  characterId: string;
  transform?: string;
  variableValues: Record<string, unknown>;
};

/**
 * Actors are laid out in v2 coordinates: 1-indexed with y counting up from the
 * bottom, which is the opposite of the order the rows are written in.
 */
function actorsFromMap(map: string[]): Record<string, Actor> {
  const height = map.length;
  const actors: Record<string, Actor> = {};
  let n = 0;

  map.forEach((row, rowIndex) => {
    const y = height - rowIndex;
    Array.from(row).forEach((char, colIndex) => {
      if (char === ".") {
        return;
      }
      const tile = TILES[char];
      if (!tile) {
        throw new Error(`Unknown tile '${char}' in map row "${row}"`);
      }
      const id = NAMED_IDS[char] ?? `t${(n += 1)}`;
      if (actors[id]) {
        throw new Error(`Duplicate '${char}' in map - ${id} is placed twice`);
      }
      actors[id] = {
        id,
        position: { x: colIndex + 1, y },
        appearance: tile.appearance,
        characterId: tile.characterId,
        ...(tile.transform ? { transform: tile.transform } : {}),
        variableValues: {},
      };
    });
  });

  return actors;
}

function buildWorld(
  lesson: LessonWorld,
  library: { characters: any; characterZOrder: string[] },
) {
  const width = lesson.map[0]!.length;
  if (lesson.map.some((row) => row.length !== width)) {
    throw new Error(
      `Map rows for ${lesson.slug} are not all ${width} characters wide`,
    );
  }

  const actors = actorsFromMap(lesson.map);
  const characters = JSON.parse(JSON.stringify(library.characters));

  if (lesson.prebuiltRules) {
    const character = characters[lesson.prebuiltRules.characterId];
    const idle = character.rules.find((r: any) => r.event === "idle");
    if (!idle) {
      throw new Error(
        `Character ${lesson.prebuiltRules.characterId} has no idle container`,
      );
    }
    idle.rules.unshift(...lesson.prebuiltRules.rules);
  }

  const stage = {
    id: "root",
    name: "Level 1",
    world: "root",
    order: 0,
    backgroundFade: true,
    variableValues: {
      width: `${width}`,
      wrapX: "false",
      height: `${lesson.map.length}`,
      wrapY: "false",
      tileSize: "40",
      background: "url(/Layer0_2.png)",
    },
    actors,
    startActors: JSON.parse(JSON.stringify(actors)),
  };

  return {
    version: 2,
    characters,
    characterZOrder: library.characterZOrder,
    world: {
      id: "root",
      input: { keys: {}, clicks: {} },
      stages: { root: stage },
      globals: {
        click: { id: "click", name: "Clicked Actor", type: "actor", value: "" },
        keypress: {
          id: "keypress",
          name: "Key Pressed",
          type: "key",
          value: "",
        },
        cameraFollow: {
          id: "cameraFollow",
          name: "Camera Follow",
          type: "actor",
          value: "",
        },
        selectedStageId: {
          id: "selectedStageId",
          name: "Current Level",
          type: "stage",
          value: "root",
        },
      },
      stageVariables: {
        width: { id: "width", name: "Width", type: "number" },
        wrapX: { id: "wrapX", name: "Wrap Horizontally", type: "boolean" },
        height: { id: "height", name: "Height", type: "number" },
        wrapY: { id: "wrapY", name: "Wrap Vertically", type: "boolean" },
        tileSize: { id: "tileSize", name: "Tile Size", type: "number" },
        background: {
          id: "background",
          name: "Background",
          type: "background",
        },
      },
      history: [],
      metadata: { id: 0, name: "", published: false, description: null },
      evaluatedRuleDetails: {},
    },
    // The editor loads a world's data as its entire redux state, so these have
    // to be here even though nothing in a fresh lesson world uses them.
    undoStack: [],
    redoStack: [],
    ui: {
      modal: { openId: null },
      paint: { characterId: null, appearanceId: null },
      playback: { speed: 500, running: false, runningDirection: "forward" },
      tutorial: { stepIndex: 0 },
      keypicker: {
        open: false,
        purpose: "condition",
        initialKey: null,
        characterId: null,
        replaceConditionKey: null,
      },
      stampToolItem: null,
      selectedActors: null,
      selectedRuleId: null,
      selectedToolId: "pointer",
      selectedCharacterId: null,
    },
    recording: {
      phase: "record",
      extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
      ruleId: null,
      actions: [],
      actorId: null,
      conditions: [],
      characterId: null,
      beforeWorld: emptyRecordingWorld("before"),
      afterWorld: emptyRecordingWorld("after"),
    },
  };
}

/** The empty before/after worlds the rule recorder starts from. */
function emptyRecordingWorld(id: "before" | "after") {
  return {
    id,
    input: { keys: {}, clicks: {} },
    stages: {},
    globals: {
      click: { id: "click", name: "Clicked Actor", type: "actor", value: "" },
      keypress: { id: "keypress", name: "Key Pressed", type: "key", value: "" },
      cameraFollow: {
        id: "cameraFollow",
        name: "Camera Follow",
        type: "actor",
        value: "",
      },
      selectedStageId: {
        id: "selectedStageId",
        name: "Current Level",
        type: "stage",
        value: "",
      },
    },
    history: [],
    metadata: { id: 0, name: "", published: false, description: null },
    evaluatedRuleIds: {},
  };
}

const library = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const lesson of LESSON_WORLDS) {
  const world = buildWorld(lesson, library);
  const file = path.join(OUT_DIR, `${lesson.slug}.json`);
  fs.writeFileSync(file, `${JSON.stringify(world, null, 2)}\n`);
  const actorCount = Object.keys(world.world.stages.root.actors).length;
  console.log(
    `${lesson.slug}.json - ${actorCount} actors, ${fs.statSync(file).size} bytes`,
  );
}
