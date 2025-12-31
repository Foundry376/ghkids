/**
 * Test fixtures for WorldOperator integration tests.
 *
 * These factory methods use an overrides pattern - pass an object with
 * required fields plus any optional overrides for customization.
 */

import {
  Actor,
  Character,
  Characters,
  FrameInput,
  Globals,
  Rule,
  RuleAction,
  RuleExtent,
  RuleTreeEventItem,
  Stage,
  World,
} from "../../../types";
import { WORLDS } from "../../constants/constants";
import WorldOperator from "../world-operator";

// ============================================================================
// Factory Methods
// ============================================================================

export function makeGlobals(overrides: Partial<Globals> = {}): Globals {
  return {
    click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
    keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
    selectedStageId: {
      id: "selectedStageId",
      name: "Current Stage",
      value: "stage-1",
      type: "stage",
    },
    cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
    ...overrides,
  };
}

export function makeInput(overrides: { keys?: number[]; clicks?: string[] } = {}): FrameInput {
  const { keys = [], clicks = [] } = overrides;
  return {
    keys: Object.fromEntries(keys.map((k) => [k, true as const])),
    clicks: Object.fromEntries(clicks.map((c) => [c, true as const])),
  };
}

export function makeActor(overrides: Partial<Actor> & { id: string; characterId: string }): Actor {
  return {
    position: { x: 0, y: 0 },
    appearance: "default",
    variableValues: {},
    ...overrides,
  };
}

export function makeExtent(overrides: Partial<RuleExtent> = {}): RuleExtent {
  return {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
    ignored: {},
    ...overrides,
  };
}

export function makeRule(
  overrides: Partial<Rule> & {
    id: string;
    mainActorId: string;
    actors: Record<string, Actor>;
    actions: RuleAction[];
  },
): Rule {
  return {
    type: "rule",
    name: `Rule ${overrides.id}`,
    conditions: [],
    extent: makeExtent(),
    ...overrides,
  };
}

export function makeEventGroup(
  overrides: Partial<RuleTreeEventItem> & {
    id: string;
    event: "idle" | "key" | "click";
    rules: Rule[];
  },
): RuleTreeEventItem {
  return {
    type: "group-event",
    ...overrides,
  };
}

export function makeCharacter(overrides: Partial<Character> & { id: string }): Character {
  return {
    name: overrides.id,
    rules: [],
    variables: {},
    spritesheet: {
      appearances: { default: [] },
      appearanceNames: { default: "Default" },
    },
    ...overrides,
  };
}

export function makeStage(
  overrides: Partial<Stage> & { id: string; actors: Record<string, Actor> },
): Stage {
  return {
    order: 0,
    name: "Test Stage",
    background: "",
    width: 10,
    height: 10,
    wrapX: false,
    wrapY: false,
    startThumbnail: "",
    startActors: {},
    ...overrides,
  };
}

export function makeWorld(overrides: Partial<World> & { stage: Stage }): World {
  const { stage, globals = makeGlobals(), input = makeInput(), ...rest } = overrides;
  return {
    id: WORLDS.ROOT,
    stages: { [stage.id]: stage },
    globals: { ...globals, selectedStageId: { ...globals.selectedStageId, value: stage.id } },
    input,
    evaluatedRuleDetails: {},
    history: [],
    metadata: {
      name: "Test World",
      id: 0,
      published: false,
      description: null,
    },
    ...rest,
  };
}

// ============================================================================
// Simulation Helpers
// ============================================================================

/**
 * Run the simulation for N frames and return the final world state
 */
export function runSimulation(
  world: World,
  characters: Characters,
  frames: number,
  inputPerFrame?: FrameInput[],
): World {
  let current: World = world;
  for (let i = 0; i < frames; i++) {
    if (inputPerFrame && inputPerFrame[i]) {
      current = { ...current, input: inputPerFrame[i] };
    }
    const operator = WorldOperator(current, characters);
    current = operator.tick() as World;
  }
  return current;
}

/**
 * Get actor positions from a world state as a simple map
 */
export function getActorPositions(world: World): Record<string, { x: number; y: number }> {
  const stage = Object.values(world.stages)[0];
  const positions: Record<string, { x: number; y: number }> = {};
  for (const actor of Object.values(stage.actors)) {
    positions[actor.id] = { ...actor.position };
  }
  return positions;
}

/**
 * Get a specific actor from the world
 */
export function getActor(world: World, actorId: string): Actor | undefined {
  const stage = Object.values(world.stages)[0];
  return stage.actors[actorId];
}

/**
 * Get all actors of a specific character type
 */
export function getActorsByCharacter(world: World, characterId: string): Actor[] {
  const stage = Object.values(world.stages)[0];
  return Object.values(stage.actors).filter((a) => a.characterId === characterId);
}

// ============================================================================
// Custom Assertion Helpers
// ============================================================================

/**
 * Custom assertion error with descriptive message
 */
class WorldAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorldAssertionError";
  }
}

/**
 * Assert that an actor exists in the world
 */
export function expectActorExists(world: World, actorId: string): void {
  const actor = getActor(world, actorId);
  if (!actor) {
    const stage = Object.values(world.stages)[0];
    const existingActors = Object.keys(stage.actors);
    throw new WorldAssertionError(
      `Expected actor "${actorId}" to exist, but it was not found.\n` +
        `  Existing actors: [${existingActors.join(", ") || "none"}]`,
    );
  }
}

/**
 * Assert that an actor does not exist in the world (was deleted)
 */
export function expectActorDeleted(world: World, actorId: string): void {
  const actor = getActor(world, actorId);
  if (actor) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" to be deleted, but it still exists.\n` +
        `  Position: (${actor.position.x}, ${actor.position.y})\n` +
        `  Appearance: ${actor.appearance}`,
    );
  }
}

/**
 * Assert an actor's position
 */
export function expectActorPosition(
  world: World,
  actorId: string,
  expected: { x: number; y: number },
): void {
  const actor = getActor(world, actorId);
  if (!actor) {
    const stage = Object.values(world.stages)[0];
    const existingActors = Object.keys(stage.actors);
    throw new WorldAssertionError(
      `Expected actor "${actorId}" at position (${expected.x}, ${expected.y}), ` +
        `but the actor does not exist.\n` +
        `  Existing actors: [${existingActors.join(", ") || "none"}]`,
    );
  }
  if (actor.position.x !== expected.x || actor.position.y !== expected.y) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" at position (${expected.x}, ${expected.y}), ` +
        `but it was at (${actor.position.x}, ${actor.position.y}).`,
    );
  }
}

/**
 * Assert an actor's appearance
 */
export function expectActorAppearance(world: World, actorId: string, expected: string): void {
  const actor = getActor(world, actorId);
  if (!actor) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" with appearance "${expected}", ` +
        `but the actor does not exist.`,
    );
  }
  if (actor.appearance !== expected) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" appearance to be "${expected}", ` +
        `but it was "${actor.appearance}".`,
    );
  }
}

/**
 * Assert an actor's transform
 */
export function expectActorTransform(world: World, actorId: string, expected: string): void {
  const actor = getActor(world, actorId);
  if (!actor) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" with transform "${expected}", ` +
        `but the actor does not exist.`,
    );
  }
  const actual = actor.transform ?? "0";
  if (actual !== expected) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" transform to be "${expected}", ` + `but it was "${actual}".`,
    );
  }
}

/**
 * Assert an actor's variable value
 */
export function expectActorVariable(
  world: World,
  actorId: string,
  variableId: string,
  expected: string,
): void {
  const actor = getActor(world, actorId);
  if (!actor) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" variable "${variableId}" to be "${expected}", ` +
        `but the actor does not exist.`,
    );
  }
  const actual = actor.variableValues[variableId];
  if (actual !== expected) {
    throw new WorldAssertionError(
      `Expected actor "${actorId}" variable "${variableId}" to be "${expected}", ` +
        `but it was "${actual ?? "(not set)"}".`,
    );
  }
}

/**
 * Assert a global variable value
 */
export function expectGlobalVariable(world: World, globalId: string, expected: string): void {
  const global = world.globals[globalId];
  if (!global) {
    const existingGlobals = Object.keys(world.globals);
    throw new WorldAssertionError(
      `Expected global "${globalId}" to be "${expected}", but the global does not exist.\n` +
        `  Existing globals: [${existingGlobals.join(", ")}]`,
    );
  }
  if (global.value !== expected) {
    throw new WorldAssertionError(
      `Expected global "${globalId}" to be "${expected}", but it was "${global.value}".`,
    );
  }
}

/**
 * Assert the count of actors with a specific character type
 */
export function expectActorCount(world: World, characterId: string, expected: number): void {
  const actors = getActorsByCharacter(world, characterId);
  if (actors.length !== expected) {
    const actorInfo = actors.map((a) => `${a.id} at (${a.position.x}, ${a.position.y})`).join(", ");
    throw new WorldAssertionError(
      `Expected ${expected} actor(s) of character "${characterId}", but found ${actors.length}.\n` +
        `  Found: [${actorInfo || "none"}]`,
    );
  }
}

/**
 * Assert that a newly created actor exists at a specific position
 * (for actors whose ID is generated at runtime)
 */
export function expectNewActorAtPosition(
  world: World,
  characterId: string,
  position: { x: number; y: number },
  excludeActorIds: string[] = [],
): Actor {
  const actors = getActorsByCharacter(world, characterId).filter(
    (a) => !excludeActorIds.includes(a.id),
  );

  const actorAtPos = actors.find((a) => a.position.x === position.x && a.position.y === position.y);

  if (!actorAtPos) {
    const actorInfo = actors.map((a) => `${a.id} at (${a.position.x}, ${a.position.y})`).join(", ");
    throw new WorldAssertionError(
      `Expected a new actor of character "${characterId}" at position (${position.x}, ${position.y}), ` +
        `but none was found.\n` +
        `  Found actors: [${actorInfo || "none"}]`,
    );
  }

  return actorAtPos;
}

// ============================================================================
// Scenario Types
// ============================================================================

/**
 * A test scenario defines the initial state and expected behavior for a simulation test.
 */
export interface TestScenario {
  /** Description of what this scenario tests */
  name: string;
  /** The game characters with their rules */
  characters: Characters;
  /** The initial world state */
  world: World;
  /** Number of frames to simulate */
  frames: number;
  /** Optional per-frame input (key presses, clicks) */
  inputPerFrame?: FrameInput[];
  /** Assertions to run on the final world state */
  assertions: (result: World) => void;
}

/**
 * Run a test scenario
 */
export function runScenario(scenario: TestScenario): void {
  const result = runSimulation(
    scenario.world,
    scenario.characters,
    scenario.frames,
    scenario.inputPerFrame,
  );
  scenario.assertions(result);
}
