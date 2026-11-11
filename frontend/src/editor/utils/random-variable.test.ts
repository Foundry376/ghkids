import { expect } from "chai";
import { Characters, RuleCondition } from "../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeGlobals,
  makeRule,
  makeStage,
  makeWorld,
  runSimulation,
} from "./__tests__/test-fixtures";
import { BUILTIN_STAGE_VARIABLES } from "./builtin-stage-variables";
import {
  chanceOfRandomComparison,
  defaultRandomCondition,
  formatRandomValue,
  parseRandomInput,
  randomRangeForRuleValue,
  rollRandomInRange,
} from "./stage-helpers";
import WorldOperator from "./world-operator";

/**
 * Random variables: a variable whose value is re-rolled once at the start of
 * every tick, so every rule checked during the tick sees the same number.
 */

const charId = "ship";
const rollVar = "var-roll";
const hitsVar = "var-hits";

/**
 * Dave's Space Invaders setup: "fire if roll < 10" and "move if roll >= 10"
 * as two separate rules. With a per-tick roll exactly one of them fires.
 */
function setup(stageActorIds: string[]) {
  const ruleActor = makeActor({ id: "rule-ship", characterId: charId });
  const cond = (comparator: RuleCondition["comparator"]): RuleCondition => ({
    key: `cond-${comparator}`,
    enabled: true,
    left: { actorId: "rule-ship", variableId: rollVar },
    comparator,
    right: { constant: "10" },
  });
  const fire = makeRule({
    id: "fire",
    mainActorId: "rule-ship",
    actors: { "rule-ship": ruleActor },
    conditions: [cond("<")],
    actions: [
      {
        type: "variable",
        actorId: "rule-ship",
        variable: hitsVar,
        operation: "add",
        value: { constant: "1" },
      },
    ],
  });
  const move = makeRule({
    id: "move",
    mainActorId: "rule-ship",
    actors: { "rule-ship": ruleActor },
    conditions: [cond(">=")],
    actions: [{ type: "move", actorId: "rule-ship", delta: { x: 1, y: 0 } }],
  });
  const character = makeCharacter({
    id: charId,
    // Two separate event groups so both rules are always checked.
    rules: [
      makeEventGroup({ id: "g1", event: "idle", rules: [fire] }),
      makeEventGroup({ id: "g2", event: "idle", rules: [move] }),
    ],
    variables: {
      [rollVar]: { id: rollVar, name: "Roll", defaultValue: "0", random: { min: 0, max: 99 } },
      [hitsVar]: { id: hitsVar, name: "Hits", defaultValue: "0" },
    },
  });
  const characters: Characters = { [charId]: character };
  const actors = Object.fromEntries(
    stageActorIds.map((id, i) => [
      id,
      makeActor({ id, characterId: charId, position: { x: 1, y: i + 1 } }),
    ]),
  );
  const world = makeWorld({
    stage: makeStage({ id: "stage-1", variableValues: { width: "20", wrapX: "true" }, actors }),
  });
  return { world, characters };
}

describe("random variables", () => {
  const realRandom = Math.random;
  afterEach(() => {
    Math.random = realRandom;
  });

  it("rolls whole numbers within the range, inclusive", () => {
    Math.random = () => 0;
    expect(rollRandomInRange(0, 99)).to.equal(0);
    Math.random = () => 0.999999;
    expect(rollRandomInRange(0, 99)).to.equal(99);
    Math.random = () => 0.25;
    expect(rollRandomInRange(0, 99)).to.equal(25);
    Math.random = () => 0.999999;
    expect(rollRandomInRange(99, 0)).to.equal(99);
  });

  it("stores the roll on the actor so the inspector and rules can read it", () => {
    Math.random = () => 0.42;
    const { world, characters } = setup(["a"]);
    const next = runSimulation(world, characters, 1);
    expect(next.stages["stage-1"].actors.a.variableValues[rollVar]).to.equal("42");
  });

  it("rules checking the same variable in one tick all see the same roll", () => {
    const { world, characters } = setup(["a"]);
    let current = world;
    for (let i = 0; i < 300; i++) {
      const before = current.stages["stage-1"].actors.a;
      current = runSimulation(current, characters, 1);
      const after = current.stages["stage-1"].actors.a;
      const fired = Number(after.variableValues[hitsVar] ?? 0) - Number(before.variableValues[hitsVar] ?? 0);
      const moved = after.position.x !== before.position.x ? 1 : 0;
      // Exactly one of "fire" and "move" every tick - never both, never neither.
      expect(fired + moved).to.equal(1);
    }
  });

  it("rolls only once per variable per actor per tick", () => {
    let calls = 0;
    Math.random = () => {
      calls++;
      return 0.5;
    };
    const { world, characters } = setup(["a", "b", "c"]);
    runSimulation(world, characters, 1);
    expect(calls).to.equal(3);
  });

  it("gives each actor its own roll for a character variable", () => {
    const rolls = [0.1, 0.9];
    Math.random = () => rolls.shift() ?? 0;
    const { world, characters } = setup(["a", "b"]);
    const next = runSimulation(world, characters, 1);
    const values = Object.values(next.stages["stage-1"].actors).map(
      (a) => a.variableValues[rollVar],
    );
    expect(values.sort()).to.deep.equal(["10", "90"]);
  });

  it("rolls random variables for an actor created mid-tick", () => {
    Math.random = () => 0.37;
    const { characters } = setup([]);
    const spawner = makeCharacter({
      id: "spawner",
      rules: [
        makeEventGroup({
          id: "spawn-group",
          event: "idle",
          rules: [
            makeRule({
              id: "spawn",
              mainActorId: "rule-spawner",
              actors: { "rule-spawner": makeActor({ id: "rule-spawner", characterId: "spawner" }) },
              extent: { xmin: 0, xmax: 1, ymin: 0, ymax: 0, ignored: { "1,0": true } },
              actions: [
                {
                  type: "create",
                  actorId: "new-ship",
                  actor: makeActor({ id: "new-ship", characterId: charId }),
                  offset: { x: 1, y: 0 },
                },
              ],
            }),
          ],
        }),
      ],
    });
    const world = makeWorld({
      stage: makeStage({
        id: "stage-1",
        actors: { s: makeActor({ id: "s", characterId: "spawner", position: { x: 1, y: 1 } }) },
      }),
    });
    const next = runSimulation(world, { ...characters, spawner }, 1);
    const created = Object.values(next.stages["stage-1"].actors).find(
      (a) => a.characterId === charId,
    );
    expect(created?.variableValues[rollVar]).to.equal("37");
  });

  it("re-rolls world and level random variables every tick, once each", () => {
    let calls = 0;
    const sequence = [0.05, 0.6, 0.7, 0.2];
    Math.random = () => sequence[calls++] ?? 0;
    const { characters } = setup([]);
    const world = makeWorld({
      globals: makeGlobals({
        dice: { id: "dice", name: "Dice", value: "0", random: { min: 1, max: 6 } },
        plain: { id: "plain", name: "Plain", value: "7" },
      }),
      stage: makeStage({ id: "stage-1", variableValues: { lvl: "0" }, actors: {} }),
      stageVariables: {
        ...BUILTIN_STAGE_VARIABLES,
        lvl: { id: "lvl", name: "Level Roll", random: { min: 0, max: 9 } },
      },
    });
    const one = runSimulation(world, characters, 1);
    expect(one.globals.dice.value).to.equal("1");
    expect(one.globals.plain.value).to.equal("7");
    expect(one.stages["stage-1"].variableValues.lvl).to.equal("6");
    const two = runSimulation(one, characters, 1);
    expect(two.globals.dice.value).to.equal("5");
    expect(two.stages["stage-1"].variableValues.lvl).to.equal("2");
    expect(calls).to.equal(4);
  });

  it("records a tick that only re-rolled random variables, so stepping back restores the roll", () => {
    const { characters } = setup([]);
    // Nothing on the stage has rules: the only change each tick is the roll.
    const world = makeWorld({
      globals: makeGlobals({
        dice: { id: "dice", name: "Dice", value: "0", random: { min: 1, max: 6 } },
      }),
      stage: makeStage({ id: "stage-1", actors: {} }),
    });
    Math.random = () => 0.5;
    const one = runSimulation(world, characters, 1);
    Math.random = () => 0.9;
    const two = runSimulation(one, characters, 1);
    expect(two.history).to.have.length(2);
    expect(two.globals.dice.value).to.equal("6");

    const back = WorldOperator(two, characters).untick() as typeof two;
    expect(back.globals.dice.value).to.equal("4");
  });

  it("doesn't record idle ticks in a game without random variables", () => {
    const { characters } = setup([]);
    const world = makeWorld({ stage: makeStage({ id: "stage-1", actors: {} }) });
    expect(runSimulation(world, characters, 3).history).to.have.length(0);
  });
});

describe("random variables in the editor", () => {
  const percent = { min: 0, max: 99 };
  const die = { min: 1, max: 6 };

  it("shows a 0-99 roll as a percentage and other ranges as plain numbers", () => {
    expect(formatRandomValue("37", percent)).to.equal("37%");
    expect(formatRandomValue("4", die)).to.equal("4");
    expect(formatRandomValue(undefined, percent)).to.equal("");
  });

  it("drops a typed % so the condition still compares numbers", () => {
    expect(parseRandomInput("25%")).to.equal("25");
    expect(parseRandomInput(" 25 % ")).to.equal("25");
    expect(parseRandomInput("25")).to.equal("25");
  });

  it("works out how often a condition on a roll is true", () => {
    expect(chanceOfRandomComparison(percent, "<", "25")).to.equal(0.25);
    expect(chanceOfRandomComparison(percent, "<=", "25")).to.equal(0.26);
    expect(chanceOfRandomComparison(percent, ">=", "90")).to.equal(0.1);
    expect(chanceOfRandomComparison(percent, "=", "7")).to.equal(0.01);
    expect(chanceOfRandomComparison(percent, "<", "100")).to.equal(1);
    expect(chanceOfRandomComparison(die, "=", "6")).to.equal(1 / 6);
    expect(chanceOfRandomComparison(die, ">", "6")).to.equal(0);
    // "25 > Random" is the same as "Random < 25".
    expect(chanceOfRandomComparison(percent, ">", "25", "right")).to.equal(0.25);
    // Not a number, or not a numeric comparison: no answer.
    expect(chanceOfRandomComparison(percent, "<", "")).to.equal(null);
    expect(chanceOfRandomComparison(percent, "<", "lots")).to.equal(null);
    expect(chanceOfRandomComparison(percent, "contains", "5")).to.equal(null);
  });

  it("starts a dropped random variable's condition at about half the time", () => {
    expect(defaultRandomCondition(percent)).to.deep.equal({ comparator: "<", value: "50" });
    expect(defaultRandomCondition(die)).to.deep.equal({ comparator: "<", value: "4" });
    for (const range of [percent, die, { min: 0, max: 0 }]) {
      const { comparator, value } = defaultRandomCondition(range);
      const chance = chanceOfRandomComparison(range, comparator, value)!;
      expect(chance).to.be.within(0.5, 1);
    }
  });

  it("finds the range of the random variable a rule value reads", () => {
    const { world, characters } = setup(["a"]);
    const actors = world.stages["stage-1"].actors;
    const worldWithRandoms = {
      globals: makeGlobals({
        dice: { id: "dice", name: "Dice", value: "0", random: die },
        plain: { id: "plain", name: "Plain", value: "0" },
      }),
      stageVariables: {
        ...BUILTIN_STAGE_VARIABLES,
        lvl: { id: "lvl", name: "Level Roll", random: percent },
      },
    };
    const ctx = { actors, characters, world: worldWithRandoms };
    expect(randomRangeForRuleValue({ actorId: "a", variableId: rollVar }, ctx)).to.deep.equal(percent);
    expect(randomRangeForRuleValue({ actorId: "a", variableId: hitsVar }, ctx)).to.equal(undefined);
    expect(randomRangeForRuleValue({ globalId: "dice" }, ctx)).to.deep.equal(die);
    expect(randomRangeForRuleValue({ globalId: "plain" }, ctx)).to.equal(undefined);
    expect(randomRangeForRuleValue({ stageVariableId: "lvl" }, ctx)).to.deep.equal(percent);
    expect(randomRangeForRuleValue({ constant: "5" }, ctx)).to.equal(undefined);
  });
});
