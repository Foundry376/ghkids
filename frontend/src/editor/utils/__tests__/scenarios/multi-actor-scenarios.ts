/**
 * Multi-actor interaction scenarios including collisions and interactions between different actors.
 */

import { Character, Characters } from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeExtent,
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

  // Place player at the default (1, 1) and coin at (3, 1) (1-indexed Y-up).
  const playerActor = makeActor({ id: playerActorId, characterId: playerCharId, position: { x: 1, y: 1 } });
  const coinActor = makeActor({ id: coinActorId, characterId: coinCharId, position: { x: 3, y: 1 } });
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
      // Player started at (1, 1) and walked right twice (blocked at coin
      // on the third attempt because two actors occupy the same tile).
      expectActorPosition(result, playerActorId, { x: 3, y: 1 });
      expectActorPosition(result, coinActorId, { x: 3, y: 1 });
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

// ============================================================================
// Tick-order scenarios
//
// When two actors want the same square and only one can have it, the winner is
// the one whose character is layered on top of the other.
// ============================================================================

/**
 * A character that moves one square by `delta` if that square is empty. The
 * empty requirement comes from covering the target square in the extent with no
 * rule actor there, so the rule matches only when zero stage actors occupy it.
 */
function makeMoveIfEmptyCharacter(charId: string, delta: { x: number; y: number }): Character {
  const ruleActor = makeActor({ id: "self", characterId: charId, position: { x: 0, y: 0 } });
  const rule = makeRule({
    id: `move-${delta.x},${delta.y}-if-empty`,
    mainActorId: "self",
    actors: { self: ruleActor },
    actions: [{ type: "move", actorId: "self", delta }],
    extent: makeExtent({
      xmin: Math.min(0, delta.x),
      xmax: Math.max(0, delta.x),
      ymin: Math.min(0, delta.y),
      ymax: Math.max(0, delta.y),
    }),
  });
  const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
  return makeCharacter({ id: charId, name: `Mover ${charId}`, rules: [idleGroup] });
}

/**
 * Two actors of different characters race for the same empty square: one moves
 * right into it, the other moves left into it. Only the actor visited first
 * finds the square empty, so the character drawn on top wins.
 *
 * `topWins` flips only the layering — the actors, their rules and the order
 * they sit in the stage's dictionary are identical — so the pair of scenarios
 * shows that layering alone decides the outcome.
 */
function contestedSquareScenario(topWins: "mover-right" | "mover-left"): TestScenario {
  const rightCharId = "char-mover-right";
  const leftCharId = "char-mover-left";
  const rightActorId = "actor-mover-right";
  const leftActorId = "actor-mover-left";

  const characters: Characters = {
    [rightCharId]: makeMoveIfEmptyCharacter(rightCharId, { x: 1, y: 0 }),
    [leftCharId]: makeMoveIfEmptyCharacter(leftCharId, { x: -1, y: 0 }),
  };

  // Row 1: [mover-right x=1][contested x=2][mover-left x=3]
  const rightActor = makeActor({
    id: rightActorId,
    characterId: rightCharId,
    position: { x: 1, y: 1 },
  });
  const leftActor = makeActor({
    id: leftActorId,
    characterId: leftCharId,
    position: { x: 3, y: 1 },
  });
  const stage = makeStage({
    id: "stage-1",
    actors: { [rightActorId]: rightActor, [leftActorId]: leftActor },
  });
  const world = makeWorld({ stage });

  // characterZOrder is bottom-most first, so the winner goes last.
  const characterZOrder =
    topWins === "mover-right" ? [leftCharId, rightCharId] : [rightCharId, leftCharId];

  return {
    name: `the character layered on top wins a contested square (${topWins})`,
    characters,
    world,
    characterZOrder,
    frames: 1,
    assertions: (result) => {
      if (topWins === "mover-right") {
        expectActorPosition(result, rightActorId, { x: 2, y: 1 });
        expectActorPosition(result, leftActorId, { x: 3, y: 1 });
      } else {
        expectActorPosition(result, leftActorId, { x: 2, y: 1 });
        expectActorPosition(result, rightActorId, { x: 1, y: 1 });
      }
    },
  };
}

export function contestedSquareTopMoverRightScenario(): TestScenario {
  return contestedSquareScenario("mover-right");
}

export function contestedSquareTopMoverLeftScenario(): TestScenario {
  return contestedSquareScenario("mover-left");
}
