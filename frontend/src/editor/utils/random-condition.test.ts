import { expect } from "chai";
import { Characters, RuleCondition, RuleValue } from "../../types";
import {
  expectActorPosition,
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeRule,
  makeStage,
  makeWorld,
  runSimulation,
} from "./__tests__/test-fixtures";
import { RANDOM_CONDITION_RANGE, rollRandomInRange } from "./stage-helpers";

/**
 * The dice condition: "random 0-99 < N" lets a rule fire roughly N% of the time.
 */

const charId = "char-1";
const actorId = "actor-1";
const varId = "var-chance";

function setup(right: RuleValue, comparator: RuleCondition["comparator"] = "<") {
  const ruleActor = makeActor({ id: "rule-actor", characterId: charId });
  const rule = makeRule({
    id: "maybe-move",
    mainActorId: "rule-actor",
    actors: { "rule-actor": ruleActor },
    actions: [{ type: "move", actorId: "rule-actor", delta: { x: 1, y: 0 } }],
    conditions: [
      {
        key: "cond-random",
        enabled: true,
        left: { random: { ...RANDOM_CONDITION_RANGE } },
        comparator,
        right,
      },
    ],
  });
  const character = makeCharacter({
    id: charId,
    name: "Player",
    rules: [makeEventGroup({ id: "idle-group", event: "idle", rules: [rule] })],
    variables: { [varId]: { id: varId, name: "Chance", defaultValue: "0" } },
  });
  const characters: Characters = { [charId]: character };
  const stageActor = makeActor({
    id: actorId,
    characterId: charId,
    variableValues: { [varId]: "25" },
    position: { x: 1, y: 1 },
  });
  const world = makeWorld({
    stage: makeStage({ id: "stage-1", variableValues: { width: "20" }, actors: { [actorId]: stageActor } }),
  });
  return { world, characters };
}

describe("random conditions", () => {
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
  });

  it("fires the rule when the roll satisfies the comparison", () => {
    Math.random = () => 0.1; // rolls 10
    const { world, characters } = setup({ constant: "25" });
    expectActorPosition(runSimulation(world, characters, 1), actorId, { x: 2, y: 1 });
  });

  it("does not fire the rule when the roll fails the comparison", () => {
    Math.random = () => 0.5; // rolls 50
    const { world, characters } = setup({ constant: "25" });
    expectActorPosition(runSimulation(world, characters, 1), actorId, { x: 1, y: 1 });
  });

  it("compares against a variable dropped on the right-hand side", () => {
    Math.random = () => 0.2; // rolls 20, actor's chance is 25
    const { world, characters } = setup({ actorId: "rule-actor", variableId: varId });
    expectActorPosition(runSimulation(world, characters, 1), actorId, { x: 2, y: 1 });

    Math.random = () => 0.3; // rolls 30
    expectActorPosition(runSimulation(world, characters, 1), actorId, { x: 1, y: 1 });
  });

  it("rolls once per rule check, even when the right side references an actor", () => {
    let calls = 0;
    Math.random = () => {
      calls++;
      return 0.1;
    };
    const { world, characters } = setup({ actorId: "rule-actor", variableId: varId });
    runSimulation(world, characters, 1);
    expect(calls).to.equal(1);
  });

  it("records the rolled value in the evaluation details", () => {
    Math.random = () => 0.42;
    const { world, characters } = setup({ constant: "25" });
    const result = runSimulation(world, characters, 1);
    const cond = result.evaluatedRuleDetails[actorId]["maybe-move"].conditions[0];
    expect(cond.leftValue).to.equal("42");
    expect(cond.passed).to.equal(false);
  });

  it("fires roughly the requested fraction of the time", () => {
    const { world, characters } = setup({ constant: "25" });
    let fired = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const next = runSimulation(world, characters, 1);
      if (next.stages["stage-1"].actors[actorId].position.x === 2) fired++;
    }
    expect(fired / trials).to.be.within(0.21, 0.29);
  });
});
