import { runScenario } from "./__tests__/test-fixtures";
import {
  movementOnIdleScenario,
  movementOnKeyPressScenario,
  movementMultipleFramesScenario,
  stageBoundaryScenario,
  stageWrappingScenario,
  actorDeletionScenario,
  actorCreationScenario,
  appearanceChangeScenario,
  transformRotationScenario,
  variableSetScenario,
  variableAddScenario,
  variableAccumulateScenario,
  conditionNotMetScenario,
  conditionMetScenario,
  conditionGreaterThanScenario,
  globalModifyScenario,
} from "./__tests__/scenarios/basic-scenarios";
import { collisionScenario, coinCollectionScenario } from "./__tests__/scenarios/multi-actor-scenarios";
import { chaseGameScenario } from "./__tests__/scenarios/chase-game-scenario";
import { scoreAccumulationScenario } from "./__tests__/scenarios/score-game-scenario";

/**
 * Integration tests for the WorldOperator simulation engine.
 *
 * These tests verify that game rules evaluate correctly over multiple frames.
 * Each test sets up an initial game state, runs the simulation for N frames,
 * and verifies the final state matches expectations.
 *
 * Test scenarios are defined in separate files under __tests__/scenarios/
 */

describe("world-operator integration", () => {
  describe("basic movement rules", () => {
    it("should move an actor right on idle event", () => {
      runScenario(movementOnIdleScenario());
    });

    it("should move an actor on key press event", () => {
      runScenario(movementOnKeyPressScenario());
    });

    it("should move actor multiple times over multiple frames", () => {
      runScenario(movementMultipleFramesScenario());
    });

    it("should stop at stage boundary (non-wrapping)", () => {
      runScenario(stageBoundaryScenario());
    });
  });

  describe("actor deletion and creation", () => {
    it("should delete an actor", () => {
      runScenario(actorDeletionScenario());
    });

    it("should create a new actor", () => {
      runScenario(actorCreationScenario());
    });
  });

  describe("appearance changes", () => {
    it("should change actor appearance", () => {
      runScenario(appearanceChangeScenario());
    });
  });

  describe("variable operations", () => {
    it("should set a variable value", () => {
      runScenario(variableSetScenario());
    });

    it("should add to a variable value", () => {
      runScenario(variableAddScenario());
    });

    it("should accumulate variable over multiple frames", () => {
      runScenario(variableAccumulateScenario());
    });
  });

  describe("conditions", () => {
    it("should only trigger rule when condition is met", () => {
      runScenario(conditionNotMetScenario());
    });

    it("should trigger rule when condition is met", () => {
      runScenario(conditionMetScenario());
    });

    it("should check greater than condition", () => {
      runScenario(conditionGreaterThanScenario());
    });
  });

  describe("global variables", () => {
    it("should modify a global variable", () => {
      runScenario(globalModifyScenario());
    });
  });

  describe("multi-actor interactions", () => {
    it("should handle collision scenario with two actors", () => {
      runScenario(collisionScenario());
    });

    it("should delete coin when player reaches it", () => {
      runScenario(coinCollectionScenario());
    });
  });

  describe("transforms", () => {
    it("should set actor transform (rotation)", () => {
      runScenario(transformRotationScenario());
    });
  });

  describe("stage wrapping", () => {
    it("should wrap actor position on wrapping stage", () => {
      runScenario(stageWrappingScenario());
    });
  });

  describe("complex multi-frame scenarios", () => {
    it("should simulate a simple chase game", () => {
      runScenario(chaseGameScenario());
    });

    it("should handle score accumulation game", () => {
      runScenario(scoreAccumulationScenario());
    });
  });
});
