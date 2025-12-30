/**
 * Score accumulation game scenario.
 *
 * This tests:
 * - Global variable modifications
 * - Actor variable tracking
 * - Accumulation over multiple frames
 * - Multiple actions in a single rule
 */

import { Characters } from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeGlobals,
  makeRule,
  makeStage,
  makeWorld,
  expectGlobalVariable,
  expectActorVariable,
  TestScenario,
} from "../test-fixtures";

export function scoreAccumulationScenario(): TestScenario {
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

  return {
    name: "should handle score accumulation game",
    characters,
    world,
    frames: 5,
    assertions: (result) => {
      // Score should be 50 (5 frames * 10 points)
      expectGlobalVariable(result, globalScoreId, "50");
      // Collected should be 5
      expectActorVariable(result, actorId, varCollectedId, "5");
    },
  };
}
