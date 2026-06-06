/**
 * Multi-actor interaction scenarios including collisions and interactions between different actors.
 */

import { Character, Characters, RuleTreeFlowLoopItem } from "../../../../types";
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
// Order-independence ("settle") scenarios
//
// These exercise the settle passes in the world operator: an actor that is
// blocked because a neighbour hasn't moved yet should still get to move once
// that neighbour vacates the square, regardless of the order actors happen to
// be visited in. The canonical case is a "train" of followers that should
// preserve their spacing (each shifts by one) rather than bunching up.
// ============================================================================

/**
 * A character whose only rule is "move one square left if the square to my
 * left is empty". The empty requirement is expressed by extending the rule's
 * extent to cover the (-1, 0) square with no rule actor there, so the square
 * must contain zero stage actors for the rule to match.
 */
function makeMoveLeftIfEmptyCharacter(charId: string): Character {
  const ruleActor = makeActor({ id: "self", characterId: charId, position: { x: 0, y: 0 } });
  const rule = makeRule({
    id: "move-left-if-empty",
    mainActorId: "self",
    actors: { self: ruleActor },
    actions: [{ type: "move", actorId: "self", delta: { x: -1, y: 0 } }],
    extent: makeExtent({ xmin: -1, xmax: 0, ymin: 0, ymax: 0 }),
  });
  const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] });
  return makeCharacter({ id: charId, name: "Walker", rules: [idleGroup] });
}

/**
 * Scenario: two actors moving left in single file, with the *follower*
 * inserted (and therefore visited) before the *leader*. This is the visit
 * order that previously bunched them together: the follower saw the leader
 * still blocking its target square and gave up. With the settle pass, the
 * follower moves once the leader vacates, preserving the one-square gap.
 */
export function trainFollowerVisitedFirstScenario(): TestScenario {
  const charId = "char-walker";
  const leaderId = "actor-leader";
  const followerId = "actor-follower";

  const characters: Characters = { [charId]: makeMoveLeftIfEmptyCharacter(charId) };

  const leader = makeActor({ id: leaderId, characterId: charId, position: { x: 2, y: 1 } });
  const follower = makeActor({ id: followerId, characterId: charId, position: { x: 3, y: 1 } });
  // Insert the follower first so it is visited before the leader.
  const stage = makeStage({
    id: "stage-1",
    actors: { [followerId]: follower, [leaderId]: leader },
  });
  const world = makeWorld({ stage });

  return {
    name: "train preserves spacing when the follower is visited first",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      // Both move left by one; the gap stays at one square.
      expectActorPosition(result, leaderId, { x: 1, y: 1 });
      expectActorPosition(result, followerId, { x: 2, y: 1 });
    },
  };
}

/**
 * Same as above but with the *leader* visited first. This order already
 * worked before the settle pass; it's here to prove the new behaviour is
 * consistent (order-independent), not just shifted to a different order.
 */
export function trainLeaderVisitedFirstScenario(): TestScenario {
  const charId = "char-walker";
  const leaderId = "actor-leader";
  const followerId = "actor-follower";

  const characters: Characters = { [charId]: makeMoveLeftIfEmptyCharacter(charId) };

  const leader = makeActor({ id: leaderId, characterId: charId, position: { x: 2, y: 1 } });
  const follower = makeActor({ id: followerId, characterId: charId, position: { x: 3, y: 1 } });
  // Insert the leader first so it is visited before the follower.
  const stage = makeStage({
    id: "stage-1",
    actors: { [leaderId]: leader, [followerId]: follower },
  });
  const world = makeWorld({ stage });

  return {
    name: "train preserves spacing when the leader is visited first",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      expectActorPosition(result, leaderId, { x: 1, y: 1 });
      expectActorPosition(result, followerId, { x: 2, y: 1 });
    },
  };
}

/**
 * Scenario: a three-actor train, with the actors inserted in the
 * worst-possible (rightmost-first) order. Fully propagating the train
 * requires the settle loop to run multiple passes within a single tick.
 */
export function longTrainScenario(): TestScenario {
  const charId = "char-walker";
  const aId = "actor-a"; // leader, at x=2
  const bId = "actor-b"; // middle, at x=3
  const cId = "actor-c"; // tail, at x=4

  const characters: Characters = { [charId]: makeMoveLeftIfEmptyCharacter(charId) };

  const a = makeActor({ id: aId, characterId: charId, position: { x: 2, y: 1 } });
  const b = makeActor({ id: bId, characterId: charId, position: { x: 3, y: 1 } });
  const c = makeActor({ id: cId, characterId: charId, position: { x: 4, y: 1 } });
  // Insert tail-first so the leader (the only one that can move on the main
  // pass) is visited last, forcing the settle loop to ripple the movement
  // back through the train over multiple passes.
  const stage = makeStage({
    id: "stage-1",
    actors: { [cId]: c, [bId]: b, [aId]: a },
  });
  const world = makeWorld({ stage });

  return {
    name: "long train shifts by exactly one square per tick in any visit order",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      // The whole train shifts left by one, preserving spacing.
      expectActorPosition(result, aId, { x: 1, y: 1 });
      expectActorPosition(result, bId, { x: 2, y: 1 });
      expectActorPosition(result, cId, { x: 3, y: 1 });
    },
  };
}

/**
 * A character that runs a `loop` of "move one square left if empty" up to
 * `count` times per tick. This is the multi-step-per-tick analogue of the
 * single-step walker above.
 */
function makeLoopingMoveLeftCharacter(charId: string, count: number): Character {
  const ruleActor = makeActor({ id: "self", characterId: charId, position: { x: 0, y: 0 } });
  const moveRule = makeRule({
    id: "move-left-if-empty",
    mainActorId: "self",
    actors: { self: ruleActor },
    actions: [{ type: "move", actorId: "self", delta: { x: -1, y: 0 } }],
    extent: makeExtent({ xmin: -1, xmax: 0, ymin: 0, ymax: 0 }),
  });
  const loopGroup: RuleTreeFlowLoopItem = {
    type: "group-flow",
    id: "loop-group",
    name: "Move several times",
    behavior: "loop",
    loopCount: { constant: count },
    rules: [moveRule],
  };
  const idleGroup = makeEventGroup({ id: "idle-group", event: "idle", rules: [loopGroup] });
  return makeCharacter({ id: charId, name: "Dasher", rules: [idleGroup] });
}

/**
 * Scenario: a "dasher" loops up to three left-moves in a single tick, but a
 * one-step blocker sits in its path. Visiting the dasher first means its loop
 * is interrupted after the moves it can make immediately; once the blocker
 * vacates, the loop must resume *the same tick* and use its remaining cycles.
 *
 * Without resumable loops the dasher would stop one square short (the blocked
 * iterations would be silently discarded), so this pins the new behaviour.
 */
export function interruptedLoopResumesScenario(): TestScenario {
  const dasherCharId = "char-dasher";
  const blockerCharId = "char-blocker";
  const dasherId = "actor-dasher";
  const blockerId = "actor-blocker";

  const characters: Characters = {
    [dasherCharId]: makeLoopingMoveLeftCharacter(dasherCharId, 3),
    [blockerCharId]: makeMoveLeftIfEmptyCharacter(blockerCharId),
  };

  // Row 1: [empty x=1][blocker x=2][empty x=3][empty x=4][dasher x=5]
  const dasher = makeActor({ id: dasherId, characterId: dasherCharId, position: { x: 5, y: 1 } });
  const blocker = makeActor({ id: blockerId, characterId: blockerCharId, position: { x: 2, y: 1 } });
  // Insert the dasher first so its loop is interrupted on the main pass (the
  // blocker is still at x=2 when the dasher reaches x=3) and must resume after
  // the blocker steps aside during settling.
  const stage = makeStage({
    id: "stage-1",
    actors: { [dasherId]: dasher, [blockerId]: blocker },
  });
  const world = makeWorld({ stage });

  return {
    name: "an interrupted loop resumes its remaining cycles the same tick",
    characters,
    world,
    frames: 1,
    assertions: (result) => {
      // Blocker stepped left once: x=2 -> x=1.
      expectActorPosition(result, blockerId, { x: 1, y: 1 });
      // Dasher used all three loop cycles: x=5 -> 4 -> 3 -> 2, finishing right
      // behind the blocker rather than stalling at x=3.
      expectActorPosition(result, dasherId, { x: 2, y: 1 });
    },
  };
}
