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
  Globals,
  Rule,
  RuleTreeEventItem,
  Stage,
  World,
  FrameInput,
  RuleCondition,
  RuleAction,
  RuleExtent,
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
    selectedStageId: { id: "selectedStageId", name: "Current Stage", value: "stage-1", type: "stage" },
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
  overrides: Partial<Rule> & { id: string; mainActorId: string; actors: Record<string, Actor>; actions: RuleAction[] },
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
  overrides: Partial<RuleTreeEventItem> & { id: string; event: "idle" | "key" | "click"; rules: Rule[] },
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

export function makeStage(overrides: Partial<Stage> & { id: string; actors: Record<string, Actor> }): Stage {
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
    evaluatedRuleIds: {},
    history: [],
    metadata: { name: "Test World", id: 0 },
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
  const result = runSimulation(scenario.world, scenario.characters, scenario.frames, scenario.inputPerFrame);
  scenario.assertions(result);
}
