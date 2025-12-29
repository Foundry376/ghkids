import { expect } from "chai";
import WorldOperator from "./world-operator";
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
} from "../../types";
import { WORLDS } from "../constants/constants";

/**
 * Integration tests for the WorldOperator simulation engine.
 *
 * These tests verify that game rules evaluate correctly over multiple frames.
 * Each test sets up an initial game state, runs the simulation for N frames,
 * and verifies the final state matches expectations.
 */

// ============================================================================
// Test Fixture Helpers
// ============================================================================

let idCounter = 0;

function makeId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function makeGlobals(overrides: Partial<Globals> = {}): Globals {
  return {
    click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
    keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
    selectedStageId: { id: "selectedStageId", name: "Current Stage", value: "stage-1", type: "stage" },
    ...overrides,
  };
}

function makeInput(overrides: { keys?: number[]; clicks?: string[] } = {}): FrameInput {
  const { keys = [], clicks = [] } = overrides;
  return {
    keys: Object.fromEntries(keys.map((k) => [k, true as const])),
    clicks: Object.fromEntries(clicks.map((c) => [c, true as const])),
  };
}

function makeActor(overrides: Partial<Actor> & { id: string; characterId: string }): Actor {
  return {
    position: { x: 0, y: 0 },
    appearance: "default",
    variableValues: {},
    ...overrides,
  };
}

function makeExtent(overrides: Partial<RuleExtent> = {}): RuleExtent {
  return {
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
    ignored: {},
    ...overrides,
  };
}

function makeRule(
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

function makeEventGroup(
  overrides: Partial<RuleTreeEventItem> & { id: string; event: "idle" | "key" | "click"; rules: Rule[] },
): RuleTreeEventItem {
  return {
    type: "group-event",
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<Character> & { id: string }): Character {
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

function makeStage(overrides: Partial<Stage> & { id: string; actors: Record<string, Actor> }): Stage {
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

function makeWorld(overrides: Partial<World> & { stage: Stage }): World {
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

/**
 * Run the simulation for N frames and return the final world state
 */
function runSimulation(
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
function getActorPositions(world: World): Record<string, { x: number; y: number }> {
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
function getActor(world: World, actorId: string): Actor | undefined {
  const stage = Object.values(world.stages)[0];
  return stage.actors[actorId];
}

/**
 * Get all actors of a specific character type
 */
function getActorsByCharacter(world: World, characterId: string): Actor[] {
  const stage = Object.values(world.stages)[0];
  return Object.values(stage.actors).filter((a) => a.characterId === characterId);
}

// ============================================================================
// Test Cases
// ============================================================================

describe("world-operator integration", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  describe("basic movement rules", () => {
    it("should move an actor right on idle event", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      // Create a rule that moves the main actor right by 1
      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-right",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Mover", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      // Place actor at position (2, 3)
      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 2, y: 3 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      // Run one frame
      const result = runSimulation(world, characters, 1);

      // Actor should have moved right
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 3, y: 3 });
    });

    it("should move an actor on key press event", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      // Create a rule that moves actor up on up arrow key (key code 38)
      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-up",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 0, y: -1 } }],
      });
      const keyGroup = makeEventGroup({ id: "key-group", event: "key", rules: [rule], code: 38 });
      const character = makeCharacter({ id: charId, name: "Player", rules: [keyGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 5, y: 5 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage, input: makeInput({ keys: [38] }) });

      const result = runSimulation(world, characters, 1);

      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 5, y: 4 });
    });

    it("should not move actor when wrong key is pressed", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-up",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 0, y: -1 } }],
      });
      const keyGroup = makeEventGroup({ id: "key-group", event: "key", rules: [rule], code: 38 }); // up arrow
      const character = makeCharacter({ id: charId, name: "Player", rules: [keyGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 5, y: 5 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage, input: makeInput({ keys: [39] }) }); // right arrow instead

      const result = runSimulation(world, characters, 1);

      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 5, y: 5 }); // unchanged
    });

    it("should move actor multiple times over multiple frames", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-right",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Mover", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      // Run 5 frames
      const result = runSimulation(world, characters, 5);

      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 5, y: 0 });
    });

    it("should stop at stage boundary (non-wrapping)", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-right",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Mover", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      // Start actor near right edge (stage width is 10, so max x is 9)
      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 8, y: 0 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor }, width: 10, height: 10 });
      const world = makeWorld({ stage });

      // Run 5 frames - actor should stop at edge
      const result = runSimulation(world, characters, 5);

      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 9, y: 0 });
    });
  });

  describe("actor deletion and creation", () => {
    it("should delete an actor", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "delete-self",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "delete", actorId: "rule-actor" }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Disappearer", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 5, y: 5 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      expect(getActor(result, actorId)).to.be.undefined;
    });

    it("should create a new actor", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const newActor = makeActor({ id: "new-actor", characterId: charId });
      const rule = makeRule({
        id: "create-actor",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "create", actorId: "new-actor", actor: newActor, offset: { x: 1, y: 0 } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Spawner", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 3, y: 3 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      // Should have original actor plus one new actor
      const actorsByChar = getActorsByCharacter(result, charId);
      expect(actorsByChar).to.have.length(2);

      // New actor should be at offset position (4, 3)
      const newActorInWorld = actorsByChar.find((a) => a.id !== actorId);
      expect(newActorInWorld).to.exist;
      expect(newActorInWorld!.position).to.deep.equal({ x: 4, y: 3 });
    });
  });

  describe("appearance changes", () => {
    it("should change actor appearance", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId, appearance: "state-a" });
      const rule = makeRule({
        id: "change-appearance",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "appearance", actorId: "rule-actor", value: { constant: "state-b" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Changer", rules: [idleGroup] });
      character.spritesheet.appearances = { "state-a": [], "state-b": [] };
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, appearance: "state-a" });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      const actor = getActor(result, actorId);
      expect(actor?.appearance).to.equal("state-b");
    });
  });

  describe("variable operations", () => {
    it("should set a variable value", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-health";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "set-health",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "variable", actorId: "rule-actor", variable: varId, operation: "set", value: { constant: "100" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Character",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Health", defaultValue: "50" } },
      });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("100");
    });

    it("should add to a variable value", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-score";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "add-score",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "variable", actorId: "rule-actor", variable: varId, operation: "add", value: { constant: "10" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Character",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Score", defaultValue: "0" } },
      });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "50" } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("60");
    });

    it("should accumulate variable over multiple frames", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-counter";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "increment",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "variable", actorId: "rule-actor", variable: varId, operation: "add", value: { constant: "1" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Counter",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Counter", defaultValue: "0" } },
      });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 10);

      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("10");
    });
  });

  describe("conditions", () => {
    it("should only trigger rule when condition is met", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-can-move";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const condition: RuleCondition = {
        key: "cond-1",
        enabled: true,
        left: { actorId: "rule-actor", variableId: varId },
        comparator: "=",
        right: { constant: "1" },
      };
      const rule = makeRule({
        id: "conditional-move",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
        conditions: [condition],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Mover",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Can Move", defaultValue: "0" } },
      });
      const characters: Characters = { [charId]: character };

      // Actor with condition NOT met (var = 0)
      const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "0" } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 3);

      // Should not have moved
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 0, y: 0 });
    });

    it("should trigger rule when condition is met", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-can-move";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const condition: RuleCondition = {
        key: "cond-1",
        enabled: true,
        left: { actorId: "rule-actor", variableId: varId },
        comparator: "=",
        right: { constant: "1" },
      };
      const rule = makeRule({
        id: "conditional-move",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
        conditions: [condition],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Mover",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Can Move", defaultValue: "0" } },
      });
      const characters: Characters = { [charId]: character };

      // Actor with condition met (var = 1)
      const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "1" } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 3);

      // Should have moved 3 times
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 3, y: 0 });
    });

    it("should check greater than condition", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const varId = "var-health";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const condition: RuleCondition = {
        key: "cond-1",
        enabled: true,
        left: { actorId: "rule-actor", variableId: varId },
        comparator: ">",
        right: { constant: "50" },
      };
      const rule = makeRule({
        id: "move-if-healthy",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
        conditions: [condition],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({
        id: charId,
        name: "Player",
        rules: [idleGroup],
        variables: { [varId]: { id: varId, name: "Health", defaultValue: "100" } },
      });
      const characters: Characters = { [charId]: character };

      // Actor with health = 75 (> 50)
      const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "75" } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 1, y: 0 });
    });
  });

  describe("global variables", () => {
    it("should modify a global variable", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const globalId = "global-score";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "add-global-score",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "global", global: globalId, operation: "add", value: { constant: "100" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Scorer", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const globals = makeGlobals({
        [globalId]: { id: globalId, name: "Score", value: "0" },
      });
      const world = makeWorld({ stage, globals });

      const result = runSimulation(world, characters, 1);

      expect(result.globals[globalId].value).to.equal("100");
    });

    it("should use global in condition", () => {
      const charId = "char-1";
      const actorId = "actor-1";
      const globalId = "global-level";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const condition: RuleCondition = {
        key: "cond-1",
        enabled: true,
        left: { globalId: globalId },
        comparator: ">=",
        right: { constant: "2" },
      };
      const rule = makeRule({
        id: "move-if-level-high",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
        conditions: [condition],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Player", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });

      // Test with level = 1 (condition not met)
      const globals1 = makeGlobals({
        [globalId]: { id: globalId, name: "Level", value: "1" },
      });
      const world1 = makeWorld({ stage, globals: globals1 });
      const result1 = runSimulation(world1, characters, 1);
      expect(getActorPositions(result1)[actorId]).to.deep.equal({ x: 0, y: 0 });

      // Test with level = 3 (condition met)
      const stageActor2 = makeActor({ id: actorId, characterId: charId });
      const stage2 = makeStage({ id: "stage-1", actors: { [actorId]: stageActor2 } });
      const globals2 = makeGlobals({
        [globalId]: { id: globalId, name: "Level", value: "3" },
      });
      const world2 = makeWorld({ stage: stage2, globals: globals2 });
      const result2 = runSimulation(world2, characters, 1);
      expect(getActorPositions(result2)[actorId]).to.deep.equal({ x: 1, y: 0 });
    });
  });

  describe("multi-actor interactions", () => {
    it("should handle collision scenario with two actors", () => {
      const playerCharId = "char-player";
      const coinCharId = "char-coin";
      const playerActorId = "actor-player";
      const coinActorId = "actor-coin";

      // Player rule: move right on idle
      const playerRuleActor = makeActor({ id: "player-rule", characterId: playerCharId });
      const moveRule = makeRule({
        id: "move-right",
        mainActorId: "player-rule",
        actors: { "player-rule": playerRuleActor },
        actions: [{ type: "move", actorId: "player-rule", delta: { x: 1, y: 0 } }],
      });
      const playerIdleGroup = makeEventGroup({ id: "player-idle", event: "idle", rules: [moveRule] });
      const playerChar = makeCharacter({ id: playerCharId, name: "Player", rules: [playerIdleGroup] });

      // Coin has no rules (just sits there)
      const coinChar = makeCharacter({ id: coinCharId, name: "Coin" });

      const characters: Characters = {
        [playerCharId]: playerChar,
        [coinCharId]: coinChar,
      };

      // Place player at (0, 0) and coin at (3, 0)
      const playerActor = makeActor({ id: playerActorId, characterId: playerCharId });
      const coinActor = makeActor({ id: coinActorId, characterId: coinCharId, position: { x: 3, y: 0 } });
      const stage = makeStage({
        id: "stage-1",
        actors: { [playerActorId]: playerActor, [coinActorId]: coinActor },
      });
      const world = makeWorld({ stage });

      // After 3 frames, player should be at same position as coin
      const result = runSimulation(world, characters, 3);

      const positions = getActorPositions(result);
      expect(positions[playerActorId]).to.deep.equal({ x: 3, y: 0 });
      expect(positions[coinActorId]).to.deep.equal({ x: 3, y: 0 });
    });

    it("should delete coin when player reaches it", () => {
      const playerCharId = "char-player";
      const coinCharId = "char-coin";
      const playerActorId = "actor-player";
      const coinActorId = "actor-coin";

      // Player rule: when on same tile as coin, delete the coin
      const playerRuleActor = makeActor({ id: "player-rule", characterId: playerCharId });
      const coinRuleActor = makeActor({ id: "coin-rule", characterId: coinCharId });
      const collectRule = makeRule({
        id: "collect-coin",
        mainActorId: "player-rule",
        actors: { "player-rule": playerRuleActor, "coin-rule": coinRuleActor },
        actions: [{ type: "delete", actorId: "coin-rule" }],
      });
      const playerIdleGroup = makeEventGroup({ id: "player-idle", event: "idle", rules: [collectRule] });
      const playerChar = makeCharacter({ id: playerCharId, name: "Player", rules: [playerIdleGroup] });
      const coinChar = makeCharacter({ id: coinCharId, name: "Coin" });

      const characters: Characters = {
        [playerCharId]: playerChar,
        [coinCharId]: coinChar,
      };

      // Place player and coin on same tile
      const playerActor = makeActor({ id: playerActorId, characterId: playerCharId, position: { x: 5, y: 5 } });
      const coinActor = makeActor({ id: coinActorId, characterId: coinCharId, position: { x: 5, y: 5 } });
      const stage = makeStage({
        id: "stage-1",
        actors: { [playerActorId]: playerActor, [coinActorId]: coinActor },
      });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      // Coin should be deleted
      expect(getActor(result, coinActorId)).to.be.undefined;
      // Player should still exist
      expect(getActor(result, playerActorId)).to.exist;
    });
  });

  describe("transforms", () => {
    it("should set actor transform (rotation)", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "rotate",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "transform", actorId: "rule-actor", operation: "set", value: { constant: "90" } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Rotator", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      const actor = getActor(result, actorId);
      expect(actor?.transform).to.equal("90");
    });
  });

  describe("stage wrapping", () => {
    it("should wrap actor position on wrapping stage", () => {
      const charId = "char-1";
      const actorId = "actor-1";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
      const rule = makeRule({
        id: "move-right",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
      const character = makeCharacter({ id: charId, name: "Mover", rules: [idleGroup] });
      const characters: Characters = { [charId]: character };

      // Create wrapping stage
      const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 9, y: 0 } });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor }, width: 10, height: 10, wrapX: true });
      const world = makeWorld({ stage });

      const result = runSimulation(world, characters, 1);

      // Should wrap to x=0
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 0, y: 0 });
    });
  });

  describe("complex multi-frame scenarios", () => {
    it("should simulate a simple chase game", () => {
      const playerCharId = "char-player";
      const enemyCharId = "char-enemy";
      const playerActorId = "actor-player";
      const enemyActorId = "actor-enemy";

      // Player moves right on right arrow
      const playerRuleActor = makeActor({ id: "player-rule", characterId: playerCharId });
      const movePlayerRule = makeRule({
        id: "player-move",
        mainActorId: "player-rule",
        actors: { "player-rule": playerRuleActor },
        actions: [{ type: "move", actorId: "player-rule", delta: { x: 1, y: 0 } }],
      });
      const playerKeyGroup = makeEventGroup({ id: "player-key", event: "key", rules: [movePlayerRule], code: 39 });
      const playerChar = makeCharacter({ id: playerCharId, name: "Player", rules: [playerKeyGroup] });

      // Enemy always moves right (chasing)
      const enemyRuleActor = makeActor({ id: "enemy-rule", characterId: enemyCharId });
      const moveEnemyRule = makeRule({
        id: "enemy-move",
        mainActorId: "enemy-rule",
        actors: { "enemy-rule": enemyRuleActor },
        actions: [{ type: "move", actorId: "enemy-rule", delta: { x: 1, y: 0 } }],
      });
      const enemyIdleGroup = makeEventGroup({ id: "enemy-idle", event: "idle", rules: [moveEnemyRule] });
      const enemyChar = makeCharacter({ id: enemyCharId, name: "Enemy", rules: [enemyIdleGroup] });

      const characters: Characters = {
        [playerCharId]: playerChar,
        [enemyCharId]: enemyChar,
      };

      // Player starts at (5, 0), enemy at (0, 0)
      const playerActor = makeActor({ id: playerActorId, characterId: playerCharId, position: { x: 5, y: 0 } });
      const enemyActor = makeActor({ id: enemyActorId, characterId: enemyCharId });
      const stage = makeStage({
        id: "stage-1",
        actors: { [playerActorId]: playerActor, [enemyActorId]: enemyActor },
      });
      const world = makeWorld({ stage });

      // Simulate 3 frames with player pressing right each frame
      const inputPerFrame = [makeInput({ keys: [39] }), makeInput({ keys: [39] }), makeInput({ keys: [39] })];
      const result = runSimulation(world, characters, 3, inputPerFrame);

      const positions = getActorPositions(result);
      // Player moved 3 right (5+3=8)
      expect(positions[playerActorId]).to.deep.equal({ x: 8, y: 0 });
      // Enemy moved 3 right (0+3=3)
      expect(positions[enemyActorId]).to.deep.equal({ x: 3, y: 0 });
    });

    it("should handle score accumulation game", () => {
      const charId = "char-collector";
      const actorId = "actor-1";
      const globalScoreId = "global-score";
      const varCollectedId = "var-collected";

      const ruleActor = makeActor({ id: "rule-actor", characterId: charId });

      // Rule: add 10 to global score and increment collected counter
      const scoreRule = makeRule({
        id: "collect-point",
        mainActorId: "rule-actor",
        actors: { "rule-actor": ruleActor },
        actions: [
          { type: "global", global: globalScoreId, operation: "add", value: { constant: "10" } },
          { type: "variable", actorId: "rule-actor", variable: varCollectedId, operation: "add", value: { constant: "1" } },
        ],
      });
      const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [scoreRule] });
      const character = makeCharacter({
        id: charId,
        name: "Collector",
        rules: [idleGroup],
        variables: { [varCollectedId]: { id: varCollectedId, name: "Collected", defaultValue: "0" } },
      });
      const characters: Characters = { [charId]: character };

      const stageActor = makeActor({ id: actorId, characterId: charId });
      const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
      const globals = makeGlobals({
        [globalScoreId]: { id: globalScoreId, name: "Score", value: "0" },
      });
      const world = makeWorld({ stage, globals });

      const result = runSimulation(world, characters, 5);

      // Score should be 50 (5 frames * 10 points)
      expect(result.globals[globalScoreId].value).to.equal("50");
      // Collected should be 5
      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varCollectedId]).to.equal("5");
    });
  });
});
