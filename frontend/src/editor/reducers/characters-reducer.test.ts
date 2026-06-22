import { expect } from "chai";

import {
  Actor,
  Character,
  Characters,
  EditorState,
  Rule,
  RuleAction,
  RuleCondition,
  RuleTreeFlowLoopItem,
  RuleTreeItem,
} from "../../types";
import { deleteCharacter } from "../actions/characters-actions";
import {
  createCharacterVariable,
  deleteCharacterVariable,
  setCharacterVariablePositions,
} from "../actions/characters-actions";
import { deleteGlobal } from "../actions/world-actions";
import charactersReducer from "./characters-reducer";
import initialState from "./initial-state";

/**
 * The third arg of `charactersReducer` only reads `recording`, which
 * none of the deletion paths touch. We pass the initial editor state
 * so the type is satisfied without crafting a fake.
 */
function reduce(state: Characters, action: Parameters<typeof charactersReducer>[1]): Characters {
  return charactersReducer(state, action, initialState as EditorState);
}

function makeActor(id: string, characterId: string): Actor {
  return {
    id,
    characterId,
    appearance: "default",
    position: { x: 0, y: 0 },
    variableValues: {},
  };
}

function makeRule(overrides: {
  id: string;
  mainActorId: string;
  actors: Record<string, Actor>;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}): Rule {
  return {
    type: "rule",
    name: `Rule ${overrides.id}`,
    extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
    conditions: [],
    actions: [],
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<Character> & { id: string }): Character {
  return {
    name: overrides.id,
    rules: [],
    variables: {},
    spritesheet: {
      appearances: { default: [] },
      appearanceNames: { default: "Default" },
    },
    ...overrides,
  };
}

describe("characters-reducer scrub", () => {
  describe("DELETE_CHARACTER", () => {
    it("removes the character and scrubs references to its actors in other rules", () => {
      // BEFORE: enemy has a rule that references a player actor in both a
      // condition and an action, plus a "create player" action.
      const playerActorInRule = makeActor("player-in-rule", "player");
      const enemyActorInRule = makeActor("enemy-in-rule", "enemy");

      const enemyRule = makeRule({
        id: "rule-1",
        mainActorId: "enemy-in-rule",
        actors: {
          "enemy-in-rule": enemyActorInRule,
          "player-in-rule": playerActorInRule,
        },
        conditions: [
          {
            key: "c1",
            enabled: true,
            left: { actorId: "player-in-rule", variableId: "hp" },
            comparator: ">",
            right: { constant: "0" },
          },
          {
            key: "c2",
            enabled: true,
            left: { actorId: "enemy-in-rule", variableId: "x" },
            comparator: "=",
            right: { constant: "5" },
          },
        ],
        actions: [
          { type: "delete", actorId: "player-in-rule" },
          { type: "appearance", actorId: "enemy-in-rule", value: { constant: "happy" } },
          {
            type: "create",
            actor: makeActor("new-player", "player"),
            actorId: "new-player",
            offset: { x: 1, y: 0 },
          },
        ],
      });

      const before: Characters = {
        player: makeCharacter({ id: "player" }),
        enemy: makeCharacter({ id: "enemy", rules: [enemyRule] }),
      };

      // TRANSFORM
      const after = reduce(before, deleteCharacter("player"));

      // AFTER
      expect(after.player).to.equal(undefined);
      const rule = after.enemy.rules[0] as Rule;
      expect(Object.keys(rule.actors)).to.deep.equal(["enemy-in-rule"]);
      expect(rule.conditions).to.have.length(1);
      expect(rule.conditions[0].key).to.equal("c2");
      expect(rule.actions).to.have.length(1);
      expect(rule.actions[0]).to.deep.equal({
        type: "appearance",
        actorId: "enemy-in-rule",
        value: { constant: "happy" },
      });
    });
  });

  describe("DELETE_GLOBAL", () => {
    it("removes conditions and actions that reference the deleted global", () => {
      // BEFORE: rule reads `score` in a condition, writes `score` in an
      // action, and feeds `score` as the value to another action. A
      // built-in global condition (keypress) and an unrelated condition
      // must survive.
      const mainActor = makeActor("hero", "hero");
      const rule = makeRule({
        id: "rule-score",
        mainActorId: "hero",
        actors: { hero: mainActor },
        conditions: [
          {
            key: "c-score",
            enabled: true,
            left: { globalId: "score" },
            comparator: ">",
            right: { constant: "10" },
          },
          {
            key: "c-keypress",
            enabled: true,
            left: { globalId: "keypress" },
            comparator: "=",
            right: { constant: "Space" },
          },
          {
            key: "c-hp",
            enabled: true,
            left: { actorId: "hero", variableId: "hp" },
            comparator: ">",
            right: { globalId: "score" },
          },
        ],
        actions: [
          { type: "global", global: "score", operation: "add", value: { constant: "1" } },
          {
            type: "variable",
            actorId: "hero",
            variable: "hp",
            operation: "set",
            value: { globalId: "score" },
          },
          {
            type: "variable",
            actorId: "hero",
            variable: "hp",
            operation: "add",
            value: { constant: "1" },
          },
        ],
      });

      const before: Characters = {
        hero: makeCharacter({ id: "hero", rules: [rule] }),
      };

      // TRANSFORM
      const after = reduce(before, deleteGlobal("world-1", "score"));

      // AFTER
      const next = after.hero.rules[0] as Rule;
      expect(next.conditions.map((c) => c.key)).to.deep.equal(["c-keypress"]);
      expect(next.actions).to.have.length(1);
      expect(next.actions[0]).to.deep.equal({
        type: "variable",
        actorId: "hero",
        variable: "hp",
        operation: "add",
        value: { constant: "1" },
      });
    });
  });

  describe("DELETE_CHARACTER_VARIABLE", () => {
    it("scopes scrubbing to actors of the named character and resets matching loop counts", () => {
      // BEFORE: two characters ("hero-a" and "hero-b") share a variable id
      // "hp" — this happens after stamping a character, which shallow-copies
      // the variables map. A third character ("foo") has a rule that
      // references "hp" on both hero-a and hero-b actors; only the hero-a
      // references should be scrubbed. A loop count inside hero-a's own
      // rules referencing "hp" should be reset; one inside hero-b's rules
      // should be left alone.
      const heroAInRule = makeActor("a-in-rule", "hero-a");
      const heroBInRule = makeActor("b-in-rule", "hero-b");
      const fooMain = makeActor("foo-main", "foo");

      const fooRule = makeRule({
        id: "rule-foo",
        mainActorId: "foo-main",
        actors: { "foo-main": fooMain, "a-in-rule": heroAInRule, "b-in-rule": heroBInRule },
        conditions: [
          {
            key: "c-a-hp",
            enabled: true,
            left: { actorId: "a-in-rule", variableId: "hp" },
            comparator: ">",
            right: { constant: "0" },
          },
          {
            key: "c-b-hp",
            enabled: true,
            left: { actorId: "b-in-rule", variableId: "hp" },
            comparator: ">",
            right: { constant: "0" },
          },
        ],
        actions: [
          // Scoped to hero-a: should be removed
          {
            type: "variable",
            actorId: "a-in-rule",
            variable: "hp",
            operation: "add",
            value: { constant: "-1" },
          },
          // Scoped to hero-b: should be kept
          {
            type: "variable",
            actorId: "b-in-rule",
            variable: "hp",
            operation: "add",
            value: { constant: "-1" },
          },
          // Uses hero-a's hp as a value: should be removed
          {
            type: "variable",
            actorId: "foo-main",
            variable: "x",
            operation: "set",
            value: { actorId: "a-in-rule", variableId: "hp" },
          },
        ],
      });

      const heroAMain = makeActor("a-main", "hero-a");
      const heroALoop: RuleTreeFlowLoopItem = {
        type: "group-flow",
        behavior: "loop",
        name: "loop-a",
        id: "loop-a",
        loopCount: { variableId: "hp" },
        rules: [
          makeRule({
            id: "loop-a-inner",
            mainActorId: "a-main",
            actors: { "a-main": heroAMain },
          }),
        ],
      };

      const heroBMain = makeActor("b-main", "hero-b");
      const heroBLoop: RuleTreeFlowLoopItem = {
        type: "group-flow",
        behavior: "loop",
        name: "loop-b",
        id: "loop-b",
        loopCount: { variableId: "hp" },
        rules: [
          makeRule({
            id: "loop-b-inner",
            mainActorId: "b-main",
            actors: { "b-main": heroBMain },
          }),
        ],
      };

      const before: Characters = {
        "hero-a": makeCharacter({
          id: "hero-a",
          variables: { hp: { id: "hp", name: "HP", defaultValue: "10" } },
          rules: [heroALoop as RuleTreeItem],
        }),
        "hero-b": makeCharacter({
          id: "hero-b",
          variables: { hp: { id: "hp", name: "HP", defaultValue: "10" } },
          rules: [heroBLoop as RuleTreeItem],
        }),
        foo: makeCharacter({ id: "foo", rules: [fooRule] }),
      };

      // TRANSFORM
      const after = reduce(before, deleteCharacterVariable("hero-a", "hp"));

      // AFTER: hero-a's variable is gone
      expect(after["hero-a"].variables).to.deep.equal({});
      // hero-b keeps its identically-named variable
      expect(after["hero-b"].variables.hp).to.deep.equal({
        id: "hp",
        name: "HP",
        defaultValue: "10",
      });

      // foo's rule: only the hero-a-scoped condition/actions are removed
      const fooAfter = after.foo.rules[0] as Rule;
      expect(fooAfter.conditions.map((c) => c.key)).to.deep.equal(["c-b-hp"]);
      expect(fooAfter.actions).to.have.length(1);
      expect(fooAfter.actions[0]).to.deep.equal({
        type: "variable",
        actorId: "b-in-rule",
        variable: "hp",
        operation: "add",
        value: { constant: "-1" },
      });

      // hero-a's loop count was reset; hero-b's remains
      const aLoopAfter = after["hero-a"].rules[0] as RuleTreeFlowLoopItem;
      expect(aLoopAfter.loopCount).to.deep.equal({ constant: 2 });
      const bLoopAfter = after["hero-b"].rules[0] as RuleTreeFlowLoopItem;
      expect(bLoopAfter.loopCount).to.deep.equal({ variableId: "hp" });
    });
  });

  describe("variable grid positions", () => {
    it("places newly created variables bottom-left, one row lower each time", () => {
      const state: Characters = { hero: makeCharacter({ id: "hero" }) };

      const first = createCharacterVariable("hero");
      let next = reduce(state, first);
      expect(next["hero"].variableLayout![first.variableId]).to.deep.equal({ col: 0, row: 0 });

      const second = createCharacterVariable("hero");
      next = reduce(next, second);
      expect(next["hero"].variableLayout![second.variableId]).to.deep.equal({ col: 0, row: 1 });
    });

    it("places a new variable below the seeded appearance/position boxes", () => {
      const state: Characters = {
        hero: makeCharacter({
          id: "hero",
          variableLayout: {
            appearance: { col: 0, row: 0 },
            x: { col: 1, row: 0 },
            y: { col: 0, row: 1 },
          },
        }),
      };
      const create = createCharacterVariable("hero");
      const next = reduce(state, create);
      expect(next["hero"].variableLayout![create.variableId]).to.deep.equal({ col: 0, row: 2 });
    });

    it("SET_CHARACTER_VARIABLE_POSITIONS replaces the position for each given id", () => {
      const state: Characters = {
        hero: makeCharacter({
          id: "hero",
          variables: {
            a: { id: "a", name: "A", defaultValue: "0" },
            b: { id: "b", name: "B", defaultValue: "0" },
          },
          variableLayout: { a: { col: 0, row: 0 }, b: { col: 1, row: 0 } },
        }),
      };

      const after = reduce(
        state,
        setCharacterVariablePositions("hero", {
          a: { col: 1, row: 0 },
          b: { col: 0, row: 0 },
        }),
      );
      expect(after["hero"].variableLayout!["a"]).to.deep.equal({ col: 1, row: 0 });
      expect(after["hero"].variableLayout!["b"]).to.deep.equal({ col: 0, row: 0 });
    });

    it("DELETE_CHARACTER_VARIABLE also drops the box from the layout", () => {
      const state: Characters = {
        hero: makeCharacter({
          id: "hero",
          variables: { a: { id: "a", name: "A", defaultValue: "0" } },
          variableLayout: { a: { col: 1, row: 1 } },
        }),
      };
      const after = reduce(state, deleteCharacterVariable("hero", "a"));
      expect(after["hero"].variableLayout).to.deep.equal({});
    });
  });
});
