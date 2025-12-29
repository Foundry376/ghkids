/**
 * Basic game scenarios covering movement, variables, conditions, and simple transformations.
 */

import { expect } from "chai";
import { Characters, RuleCondition } from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeGlobals,
  makeInput,
  makeRule,
  makeStage,
  makeWorld,
  getActorPositions,
  getActor,
  getActorsByCharacter,
  TestScenario,
} from "../test-fixtures";

// ============================================================================
// Movement Scenarios
// ============================================================================

export function movementOnIdleScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 2, y: 3 } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
  const world = makeWorld({ stage });

  return {
    name: "should move an actor right on idle event",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 3, y: 3 });
    },
  };
}

export function movementOnKeyPressScenario(): TestScenario {
  const charId = "char-1";
  const actorId = "actor-1";

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

  return {
    name: "should move an actor on key press event",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 5, y: 4 });
    },
  };
}

export function movementMultipleFramesScenario(): TestScenario {
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

  return {
    name: "should move actor multiple times over multiple frames",
    characters,
    world,
    frames: 5,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 5, y: 0 });
    },
  };
}

export function stageBoundaryScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 8, y: 0 } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor }, width: 10, height: 10 });
  const world = makeWorld({ stage });

  return {
    name: "should stop at stage boundary (non-wrapping)",
    characters,
    world,
    frames: 5,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 9, y: 0 });
    },
  };
}

export function stageWrappingScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, position: { x: 9, y: 0 } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor }, width: 10, height: 10, wrapX: true });
  const world = makeWorld({ stage });

  return {
    name: "should wrap actor position on wrapping stage",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 0, y: 0 });
    },
  };
}

// ============================================================================
// Actor Creation/Deletion Scenarios
// ============================================================================

export function actorDeletionScenario(): TestScenario {
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

  return {
    name: "should delete an actor",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      expect(getActor(result, actorId)).to.be.undefined;
    },
  };
}

export function actorCreationScenario(): TestScenario {
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

  return {
    name: "should create a new actor",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const actorsByChar = getActorsByCharacter(result, charId);
      expect(actorsByChar).to.have.length(2);

      const newActorInWorld = actorsByChar.find((a) => a.id !== actorId);
      expect(newActorInWorld).to.exist;
      expect(newActorInWorld!.position).to.deep.equal({ x: 4, y: 3 });
    },
  };
}

// ============================================================================
// Appearance & Transform Scenarios
// ============================================================================

export function appearanceChangeScenario(): TestScenario {
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

  return {
    name: "should change actor appearance",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const actor = getActor(result, actorId);
      expect(actor?.appearance).to.equal("state-b");
    },
  };
}

export function transformRotationScenario(): TestScenario {
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

  return {
    name: "should set actor transform (rotation)",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const actor = getActor(result, actorId);
      expect(actor?.transform).to.equal("90");
    },
  };
}

// ============================================================================
// Variable Scenarios
// ============================================================================

export function variableSetScenario(): TestScenario {
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

  return {
    name: "should set a variable value",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("100");
    },
  };
}

export function variableAddScenario(): TestScenario {
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

  return {
    name: "should add to a variable value",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("60");
    },
  };
}

export function variableAccumulateScenario(): TestScenario {
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

  return {
    name: "should accumulate variable over multiple frames",
    characters,
    world,
    frames: 10,
    assertions: (result) => {
      const actor = getActor(result, actorId);
      expect(actor?.variableValues[varId]).to.equal("10");
    },
  };
}

// ============================================================================
// Condition Scenarios
// ============================================================================

export function conditionNotMetScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "0" } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
  const world = makeWorld({ stage });

  return {
    name: "should only trigger rule when condition is met",
    characters,
    world,
    frames: 3,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 0, y: 0 });
    },
  };
}

export function conditionMetScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "1" } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
  const world = makeWorld({ stage });

  return {
    name: "should trigger rule when condition is met",
    characters,
    world,
    frames: 3,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 3, y: 0 });
    },
  };
}

export function conditionGreaterThanScenario(): TestScenario {
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

  const stageActor = makeActor({ id: actorId, characterId: charId, variableValues: { [varId]: "75" } });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: stageActor } });
  const world = makeWorld({ stage });

  return {
    name: "should check greater than condition",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      const positions = getActorPositions(result);
      expect(positions[actorId]).to.deep.equal({ x: 1, y: 0 });
    },
  };
}

// ============================================================================
// Global Variable Scenarios
// ============================================================================

export function globalModifyScenario(): TestScenario {
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

  return {
    name: "should modify a global variable",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      expect(result.globals[globalId].value).to.equal("100");
    },
  };
}
