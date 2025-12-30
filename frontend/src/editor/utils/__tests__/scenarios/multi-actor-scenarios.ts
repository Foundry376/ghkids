/**
 * Multi-actor interaction scenarios including collisions and interactions between different actors.
 */

import { Characters } from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeRule,
  makeStage,
  makeWorld,
  expectActorPosition,
  expectActorExists,
  expectActorDeleted,
  TestScenario,
} from "../test-fixtures";

/**
 * Scenario: Two actors on the stage, player moves toward coin.
 * Tests that multiple actors can coexist and move independently.
 */
export function collisionScenario(): TestScenario {
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

  return {
    name: "should handle collision scenario with two actors",
    characters,
    world,
    frames: 3,
    assertions: (result) => {
      expectActorPosition(result, playerActorId, { x: 3, y: 0 });
      expectActorPosition(result, coinActorId, { x: 3, y: 0 });
    },
  };
}

/**
 * Scenario: Player collects a coin by deleting it when on the same tile.
 * Tests multi-actor rule evaluation with pattern matching.
 */
export function coinCollectionScenario(): TestScenario {
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

  return {
    name: "should delete coin when player reaches it",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      // Coin should be deleted
      expectActorDeleted(result, coinActorId);
      // Player should still exist
      expectActorExists(result, playerActorId);
    },
  };
}
