/**
 * Scenarios covering the flow-control containers, and in particular the
 * "Do All & Continue" (`all`) behavior:
 *
 *  - it runs every child, then hands control back so the rules *after* it in
 *    the same list still get a turn, and
 *  - because it hands control back, the actor has not finished its turn, so it
 *    is still eligible for the settle passes that let blocked rules retry
 *    (without the group's own rules firing a second time).
 */

import {
  Character,
  Characters,
  RuleTreeFlowItemAll,
  RuleTreeFlowLoopItem,
  RuleTreeItem,
} from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeExtent,
  makeRule,
  makeStage,
  makeWorld,
  expectActorPosition,
  expectActorVariable,
  TestScenario,
} from "../test-fixtures";

const COUNTER = "var-counter";

/** A rule that always applies: add 1 to the actor's own counter. */
function makeCountRule(charId: string, id: string) {
  return makeRule({
    id,
    mainActorId: "self",
    actors: { self: makeActor({ id: "self", characterId: charId }) },
    actions: [
      {
        type: "variable",
        actorId: "self",
        variable: COUNTER,
        operation: "add",
        value: { constant: "1" },
      },
    ],
  });
}

/** A rule that only applies when the square to the left is empty. */
function makeMoveLeftIfEmptyRule(charId: string, id: string) {
  return makeRule({
    id,
    mainActorId: "self",
    actors: { self: makeActor({ id: "self", characterId: charId }) },
    actions: [{ type: "move", actorId: "self", delta: { x: -1, y: 0 } }],
    extent: makeExtent({ xmin: -1, xmax: 0, ymin: 0, ymax: 0 }),
  });
}

function makeAllGroup(id: string, rules: RuleTreeItem[]): RuleTreeFlowItemAll {
  return {
    type: "group-flow",
    id,
    name: "Bookkeeping",
    behavior: "all",
    rules,
  };
}

function makeCounterCharacter(charId: string, rules: RuleTreeItem[]): Character {
  return makeCharacter({
    id: charId,
    name: "Counter",
    rules: [makeEventGroup({ id: `${charId}-idle`, event: "idle", rules })],
    variables: { [COUNTER]: { id: COUNTER, name: "Ticks", defaultValue: "0" } },
  });
}

/**
 * Scenario: an actor whose idle group is [ "Do All & Continue" bookkeeping,
 * move right ]. The group fires, and evaluation must then *continue* to the
 * move rule rather than treating the group as the actor's rule for the tick.
 */
export function doAllGroupContinuesToLaterRulesScenario(): TestScenario {
  const charId = "char-bookkeeper";
  const actorId = "actor-bookkeeper";

  const moveRight = makeRule({
    id: "move-right",
    mainActorId: "self",
    actors: { self: makeActor({ id: "self", characterId: charId }) },
    actions: [{ type: "move", actorId: "self", delta: { x: 1, y: 0 } }],
  });
  const characters: Characters = {
    [charId]: makeCounterCharacter(charId, [
      makeAllGroup("all-group", [makeCountRule(charId, "count")]),
      moveRight,
    ]),
  };

  const actor = makeActor({
    id: actorId,
    characterId: charId,
    position: { x: 1, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: actor } });

  return {
    name: "a Do All & Continue group hands control back to the rules after it",
    characters,
    world: makeWorld({ stage }),
    frames: 1,
    assertions: (result) => {
      expectActorVariable(result, actorId, COUNTER, "1");
      expectActorPosition(result, actorId, { x: 2, y: 1 });
    },
  };
}

/**
 * Scenario: the same shape, but the group sits inside a "Do First Match" group
 * alongside the move rule. The inner group firing must not satisfy the outer
 * one either — "continue" propagates up through containers that only had a
 * continue-group fire.
 */
export function doAllGroupContinuesInsideFirstGroupScenario(): TestScenario {
  const charId = "char-nested";
  const actorId = "actor-nested";

  const moveRight = makeRule({
    id: "move-right",
    mainActorId: "self",
    actors: { self: makeActor({ id: "self", characterId: charId }) },
    actions: [{ type: "move", actorId: "self", delta: { x: 1, y: 0 } }],
  });
  const firstGroup: RuleTreeItem = {
    type: "group-flow",
    id: "first-group",
    name: "Turn",
    behavior: "first",
    rules: [makeAllGroup("all-group", [makeCountRule(charId, "count")]), moveRight],
  };
  const characters: Characters = { [charId]: makeCounterCharacter(charId, [firstGroup]) };

  const actor = makeActor({
    id: actorId,
    characterId: charId,
    position: { x: 1, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: actor } });

  return {
    name: "a Do All & Continue group nested in a Do First Match group still continues",
    characters,
    world: makeWorld({ stage }),
    frames: 1,
    assertions: (result) => {
      expectActorVariable(result, actorId, COUNTER, "1");
      expectActorPosition(result, actorId, { x: 2, y: 1 });
    },
  };
}

/**
 * Scenario: the Space Invaders case. Two walkers in a train, each carrying a
 * bookkeeping "Do All & Continue" group ahead of its blocked-aware move rule,
 * inserted tail-first so the follower needs a settle pass to keep formation.
 *
 * The bookkeeping always applies, so before "continue" was honoured the
 * follower counted as having taken its turn and never got the retry — it fell
 * out of formation. The counters also pin down that the retry does not re-run
 * the bookkeeping: each actor counts exactly once for the tick.
 */
export function doAllGroupStillRetriesBlockedRulesScenario(): TestScenario {
  const charId = "char-alien";
  const leaderId = "actor-leader";
  const followerId = "actor-follower";

  const characters: Characters = {
    [charId]: makeCounterCharacter(charId, [
      makeAllGroup("all-group", [makeCountRule(charId, "count")]),
      makeMoveLeftIfEmptyRule(charId, "move-left-if-empty"),
    ]),
  };

  const leader = makeActor({
    id: leaderId,
    characterId: charId,
    position: { x: 2, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  const follower = makeActor({
    id: followerId,
    characterId: charId,
    position: { x: 3, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  // Same character, so ids decide the visit order: the follower goes first,
  // while the leader still blocks it.
  const stage = makeStage({
    id: "stage-1",
    actors: { [followerId]: follower, [leaderId]: leader },
  });

  return {
    name: "bookkeeping in a Do All & Continue group does not cost an actor its retry",
    characters,
    world: makeWorld({ stage }),
    frames: 1,
    assertions: (result) => {
      // The whole formation shifts left by one.
      expectActorPosition(result, leaderId, { x: 1, y: 1 });
      expectActorPosition(result, followerId, { x: 2, y: 1 });
      // ...and the bookkeeping ran once each, not once per settle pass.
      expectActorVariable(result, leaderId, COUNTER, "1");
      expectActorVariable(result, followerId, COUNTER, "1");
      // The group is still reported as having run even though the retry pass
      // skipped everything inside it, so the editor keeps it highlighted.
      for (const ruleId of ["all-group", "count"]) {
        if (!result.evaluatedRuleDetails[followerId]?.[ruleId]?.passed) {
          throw new Error(`Expected the follower's "${ruleId}" to be marked as applied`);
        }
      }
    },
  };
}

/**
 * Scenario: an actor with nothing but a "Do All & Continue" group. It never
 * finishes its turn, so the settle loop keeps offering it another pass — the
 * once-per-tick guard is what stops the counter running away.
 */
export function doAllGroupRunsOncePerTickScenario(): TestScenario {
  const charId = "char-idle-counter";
  const actorId = "actor-idle-counter";

  const characters: Characters = {
    [charId]: makeCounterCharacter(charId, [
      makeAllGroup("all-group", [
        makeCountRule(charId, "count-a"),
        makeCountRule(charId, "count-b"),
      ]),
    ]),
  };

  const actor = makeActor({
    id: actorId,
    characterId: charId,
    position: { x: 1, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: actor } });

  return {
    name: "a Do All & Continue group runs its rules once per tick, not once per settle pass",
    characters,
    world: makeWorld({ stage }),
    frames: 2,
    assertions: (result) => {
      // Two children, two ticks.
      expectActorVariable(result, actorId, COUNTER, "4");
    },
  };
}

/**
 * Scenario: a "Do All & Continue" group inside a loop. The once-per-tick guard
 * must not reach inside loops — repeating the body is the whole point of a
 * "Do First Match & Repeat" container.
 */
export function doAllGroupInsideLoopRepeatsScenario(): TestScenario {
  const charId = "char-looper";
  const actorId = "actor-looper";

  const loopGroup: RuleTreeFlowLoopItem = {
    type: "group-flow",
    id: "loop-group",
    name: "Count three times",
    behavior: "loop",
    loopCount: { constant: 3 },
    rules: [makeAllGroup("all-group", [makeCountRule(charId, "count")])],
  };
  const characters: Characters = { [charId]: makeCounterCharacter(charId, [loopGroup]) };

  const actor = makeActor({
    id: actorId,
    characterId: charId,
    position: { x: 1, y: 1 },
    variableValues: { [COUNTER]: "0" },
  });
  const stage = makeStage({ id: "stage-1", actors: { [actorId]: actor } });

  return {
    name: "a Do All & Continue group inside a loop repeats with the loop",
    characters,
    world: makeWorld({ stage }),
    frames: 1,
    assertions: (result) => {
      expectActorVariable(result, actorId, COUNTER, "3");
    },
  };
}
