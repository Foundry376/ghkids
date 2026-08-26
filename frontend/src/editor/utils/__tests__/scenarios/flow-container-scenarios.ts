/**
 * Scenarios covering the flow-control containers, and in particular the
 * "Do All & Continue" (`all`) behavior: it runs every child, then hands control
 * back so the rules *after* it in the same list still get a turn.
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
 * Scenario: an actor with nothing but a "Do All & Continue" group. Handing
 * control back to the parent must not cost the group a turn or earn it an
 * extra one: its children run exactly once per tick.
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
    name: "a Do All & Continue group runs its rules exactly once per tick",
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
 * Scenario: a "Do All & Continue" group inside a loop. Handing control back to
 * the parent must not stop the loop from repeating the body — repeating it is
 * the whole point of a "Do First Match & Repeat" container.
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
