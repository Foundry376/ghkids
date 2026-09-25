import { expect } from "chai";

import { Characters, FrameInput, Rule, World } from "../../types";
import { runSimulation } from "./__tests__/test-fixtures";

import drawACharacterWorld from "../../lessons/worlds/draw-a-character.json";
import animateAppearancesWorld from "../../lessons/worlds/animate-appearances.json";
import eventBlocksWorld from "../../lessons/worlds/event-blocks.json";
import fallingBoulderWorld from "../../lessons/worlds/falling-boulder.json";
import playbackWorld from "../../lessons/worlds/playback.json";
import recordARuleWorld from "../../lessons/worlds/record-a-rule.json";

/**
 * The lessons walk a kid through a specific outcome in a specific world, and
 * every step waits on the world reaching a particular state before it moves on.
 * If a rule in the shared character library or the simulation engine changes
 * under them, a lesson doesn't fail loudly - it just stops advancing, which is
 * a dead end for whoever is sitting in front of it.
 *
 * So each lesson's premise is asserted here: what the world does on its own,
 * and what it does once the rules that lesson teaches are recorded.
 */

const HERO = "aamlcui8uxr";
const BOULDER = "oou4u6jemi";
const BIRD = "bird";

type LessonWorldJSON = {
  characters: unknown;
  world: unknown;
};

function load(json: LessonWorldJSON): { world: World; characters: Characters } {
  const copy = JSON.parse(JSON.stringify(json));
  return { world: copy.world as World, characters: copy.characters as Characters };
}

const holdingRight: FrameInput = { keys: { ArrowRight: true }, clicks: {} };
const noInput: FrameInput = { keys: {}, clicks: {} };

function actorOf(world: World, characterId: string) {
  const stage = Object.values(world.stages)[0];
  return Object.values(stage.actors).find((a) => a.characterId === characterId)!;
}

function walkRight(world: World, characters: Characters, frames: number) {
  return runSimulation(world, characters, frames, Array(frames).fill(holdingRight));
}

describe("lesson worlds", () => {
  describe("playback / draw-a-character (the lava pit)", () => {
    it("has the hero and the exit on opposite sides of the pit", () => {
      const { world } = load(playbackWorld);
      const hero = actorOf(world, HERO);
      expect(hero.position).to.deep.equal({ x: 2, y: 4 });
    });

    it("drops the hero in the lava when he steps off the ledge", () => {
      const { world, characters } = load(playbackWorld);
      // One step right off the end of the ground, then let go: he falls in,
      // and the hero's "if dead" rules put him back on the near ledge.
      const input = [holdingRight, ...Array(7).fill(noInput)];
      const after = runSimulation(world, characters, input.length, input);
      const hero = actorOf(after, HERO);
      expect(hero.position.x).to.be.lessThan(5);
      expect(hero.transform ?? "0").to.equal("0");
    });

    it("lets the hero cross once five blocks bridge the gap", () => {
      const { world, characters } = load(drawACharacterWorld);
      const stage = Object.values(world.stages)[0];
      // Stand in for the character the kid draws in the lesson.
      characters["bridge-piece"] = {
        id: "bridge-piece",
        name: "Bridge",
        rules: [],
        variables: {},
        spritesheet: { appearances: { idle: [] }, appearanceNames: { idle: "Idle" } },
      };
      for (let x = 5; x <= 9; x++) {
        stage.actors[`bridge-${x}`] = {
          id: `bridge-${x}`,
          position: { x, y: 3 },
          appearance: "idle",
          characterId: "bridge-piece",
          variableValues: {},
        };
      }

      const after = walkRight(world, characters, 14);
      expect(actorOf(after, HERO).position.y).to.equal(4);
      expect(actorOf(after, HERO).position.x).to.be.at.least(10);
    });
  });

  describe("record-a-rule (the boulder in the way)", () => {
    it("stops the hero at the boulder while he has no climbing rule", () => {
      const { world, characters } = load(recordARuleWorld);
      const after = walkRight(world, characters, 12);
      expect(actorOf(after, HERO).position).to.deep.equal({ x: 9, y: 4 });
    });
  });

  describe("event-blocks (climbing already recorded)", () => {
    it("ships the climbing rule inside the hero's idle container", () => {
      const { characters } = load(eventBlocksWorld);
      const idle = characters[HERO].rules.find((r) => "event" in r && r.event === "idle");
      expect(idle && "rules" in idle && idle.rules[0]!.id).to.equal("rule-climb-a-boulder");
    });

    it("climbs the boulder and reaches the exit", () => {
      const { world, characters } = load(eventBlocksWorld);
      const after = walkRight(world, characters, 14);
      expect(actorOf(after, HERO).position.x).to.be.at.least(13);
    });
  });

  describe("falling-boulder", () => {
    /**
     * The two rules the kid records in the lesson: the boulder slips off the
     * ledge when the hero is two squares left and three down, and then falls
     * whenever the square underneath it is empty.
     */
    function recordBoulderRules(characters: Characters) {
      characters[BOULDER].rules.push(
        {
          id: "slip",
          name: "Untitled Rule",
          type: "rule",
          mainActorId: "boulder",
          actors: {
            boulder: {
              id: "boulder",
              position: { x: 0, y: 0 },
              appearance: "idle",
              characterId: BOULDER,
              variableValues: {},
            },
            hero: {
              id: "hero",
              position: { x: -2, y: -3 },
              appearance: "1483692402546",
              characterId: HERO,
              variableValues: {},
            },
            ledge: {
              id: "ledge",
              position: { x: 0, y: -1 },
              appearance: "1490493932180",
              characterId: "1483692683990",
              variableValues: {},
            },
            // The recorder captures everything inside the box, including the
            // rest of the ledge the boulder is sitting on.
            ledgeBelow: {
              id: "ledgeBelow",
              position: { x: 0, y: -2 },
              appearance: "idle",
              characterId: "1483692683990",
              variableValues: {},
            },
          },
          extent: { xmin: -2, xmax: 0, ymin: -3, ymax: 0, ignored: {} },
          actions: [{ type: "move", delta: { x: -1, y: 0 }, actorId: "boulder" }],
          conditions: [],
        },
        {
          id: "gravity",
          name: "Untitled Rule",
          type: "rule",
          mainActorId: "boulder",
          actors: {
            boulder: {
              id: "boulder",
              position: { x: 0, y: 0 },
              appearance: "idle",
              characterId: BOULDER,
              variableValues: {},
            },
          },
          extent: { xmin: 0, xmax: 0, ymin: -1, ymax: 0, ignored: {} },
          actions: [{ type: "move", delta: { x: 0, y: -1 }, actorId: "boulder" }],
          conditions: [],
        },
      );
    }

    it("leaves the boulder on the ledge until the hero walks under it", () => {
      const { world, characters } = load(fallingBoulderWorld);
      recordBoulderRules(characters);
      const after = runSimulation(world, characters, 4);
      expect(actorOf(after, BOULDER).position).to.deep.equal({ x: 11, y: 7 });
    });

    it("drops the boulder into the hero's path when he reaches the ledge", () => {
      const { world, characters } = load(fallingBoulderWorld);
      recordBoulderRules(characters);
      const after = walkRight(world, characters, 14);
      const boulder = actorOf(after, BOULDER);
      expect(boulder.position).to.deep.equal({ x: 10, y: 4 });
    });
  });

  describe("animate-appearances", () => {
    const WINGS_UP = "wings-up";
    const WINGS_DOWN = "wings-down";

    /**
     * A rule the way the recorder builds one when the kid clicks the bird with
     * the record tool: the box starts on the bird and gets dragged one square
     * right, and the recorder adds the "appearance is ___" condition itself
     * (the main-actor-appearance condition in recording-reducer).
     */
    function flapRule(id: string, from: string, to: string): Rule {
      return {
        id,
        name: "Untitled Rule",
        type: "rule",
        mainActorId: "bird",
        actors: {
          bird: {
            id: "bird",
            position: { x: 0, y: 0 },
            appearance: from,
            characterId: BIRD,
            variableValues: {},
          },
        },
        extent: { xmin: 0, xmax: 1, ymin: 0, ymax: 0, ignored: {} },
        actions: [
          // The recorder writes a dragged actor's move as an offset, not a delta.
          { type: "move", offset: { x: 1, y: 0 }, actorId: "bird" },
          { type: "appearance", value: { constant: to }, actorId: "bird" },
        ],
        conditions: [
          {
            key: "main-actor-appearance",
            left: { actorId: "bird", variableId: "appearance" },
            right: { constant: from },
            comparator: "=",
            enabled: true,
          },
        ],
      };
    }

    /** Stands in for the appearance the kid paints, and records rules in order. */
    function setup(rules: Rule[]) {
      const { world, characters } = load(animateAppearancesWorld);
      const { spritesheet } = characters[BIRD];
      spritesheet.appearances[WINGS_DOWN] = spritesheet.appearances[WINGS_UP];
      spritesheet.appearanceNames[WINGS_DOWN] = "Untitled";
      characters[BIRD].rules.push(...rules);
      return { world, characters };
    }

    it("starts the bird wings-up with nothing to do", () => {
      const { world, characters } = setup([]);
      const after = runSimulation(world, characters, 4);
      expect(actorOf(after, BIRD).position).to.deep.equal({ x: 2, y: 5 });
      expect(actorOf(after, BIRD).appearance).to.equal(WINGS_UP);
    });

    it("flaps once and stops with only the wings-up rule", () => {
      const { world, characters } = setup([flapRule("up-to-down", WINGS_UP, WINGS_DOWN)]);
      const after = runSimulation(world, characters, 4);
      expect(actorOf(after, BIRD).position).to.deep.equal({ x: 3, y: 5 });
      expect(actorOf(after, BIRD).appearance).to.equal(WINGS_DOWN);
    });

    it("alternates appearances one square at a time with both rules", () => {
      const { world, characters } = setup([
        flapRule("up-to-down", WINGS_UP, WINGS_DOWN),
        flapRule("down-to-up", WINGS_DOWN, WINGS_UP),
      ]);
      const seen = [1, 2, 3, 4].map((frames) => {
        const bird = actorOf(runSimulation(world, characters, frames), BIRD);
        return [bird.position.x, bird.appearance];
      });
      expect(seen).to.deep.equal([
        [3, WINGS_DOWN],
        [4, WINGS_UP],
        [5, WINGS_DOWN],
        [6, WINGS_UP],
      ]);
    });

    it("flaps a whole flock of stamped copies, even two in a row", () => {
      const { world, characters } = setup([
        flapRule("up-to-down", WINGS_UP, WINGS_DOWN),
        flapRule("down-to-up", WINGS_DOWN, WINGS_UP),
      ]);
      // The copies a kid might stamp: other rows of the sky, and one right
      // behind the bird, which can only move once the bird ahead of it has.
      const stage = Object.values(world.stages)[0];
      const copies = { b2: { x: 5, y: 7 }, b3: { x: 9, y: 3 }, b4: { x: 1, y: 5 } };
      for (const [id, position] of Object.entries(copies)) {
        stage.actors[id] = { ...stage.actors.bird, id, position };
      }
      const flock = ["bird", ...Object.keys(copies)];
      const start = Object.fromEntries(flock.map((id) => [id, stage.actors[id].position.x]));

      const after = Object.values(runSimulation(world, characters, 6).stages)[0];
      for (const id of flock) {
        const moved = (after.actors[id].position.x - start[id] + 14) % 14;
        expect(moved, `${id} flew`).to.be.at.least(5);
        expect(after.actors[id].position.y, `${id} stayed in its row`).to.equal(
          stage.actors[id].position.y,
        );
      }
    });

    it("wraps the bird around to the left edge and keeps flying", () => {
      const { world, characters } = setup([
        flapRule("up-to-down", WINGS_UP, WINGS_DOWN),
        flapRule("down-to-up", WINGS_DOWN, WINGS_UP),
      ]);
      // 14 squares wide: 14 flaps is one full lap back to where it started.
      const after = runSimulation(world, characters, 14);
      expect(actorOf(after, BIRD).position).to.deep.equal({ x: 2, y: 5 });
      expect(actorOf(after, BIRD).appearance).to.equal(WINGS_UP);
    });
  });
});
