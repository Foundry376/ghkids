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
import { adjustForAppearanceAnchorChange } from "../actions/characters-actions";
import { deleteCharacter } from "../actions/characters-actions";
import { deleteCharacterVariable } from "../actions/characters-actions";
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
});

describe("characters-reducer ADJUST_FOR_APPEARANCE_ANCHOR_CHANGE", () => {
  function actorAt(
    id: string,
    characterId: string,
    appearance: string,
    position: { x: number; y: number },
  ): Actor {
    return { id, characterId, appearance, position, variableValues: {} };
  }

  it("shifts a non-main affected actor so its artwork stays in the same squares", () => {
    // Anchor (0,1) -> (1,1): the anchor square moved one cell right within the
    // sprite, so the actor's position must move one cell right (user's example).
    const main = actorAt("m", "ground", "idle", { x: 0, y: 0 });
    const hero = actorAt("h", "hero", "stand", { x: 2, y: 3 });
    const rule = makeRule({ id: "r1", mainActorId: "m", actors: { m: main, h: hero } });

    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 0, y: 1 }, { x: 1, y: 1 }),
    );

    const r = after.hero.rules[0] as Rule;
    expect(r.actors.h.position).to.deep.equal({ x: 3, y: 3 });
    expect(r.actors.m.position).to.deep.equal({ x: 0, y: 0 });
    expect(r.extent).to.deep.equal({ xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} });
  });

  it("inverts the y axis (world is Y-up, sprite image is Y-down)", () => {
    // Anchor (0,0) -> (0,1): moving the anchor one cell DOWN in image space
    // means the actor position moves one cell DOWN in world space (y - 1).
    const main = actorAt("m", "ground", "idle", { x: 0, y: 0 });
    const hero = actorAt("h", "hero", "stand", { x: 2, y: 3 });
    const rule = makeRule({ id: "r1", mainActorId: "m", actors: { m: main, h: hero } });

    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 0, y: 0 }, { x: 0, y: 1 }),
    );

    const r = after.hero.rules[0] as Rule;
    expect(r.actors.h.position).to.deep.equal({ x: 2, y: 2 });
  });

  it("uses a transform-aware delta for rotated/flipped actors", () => {
    // For a 90°-rotated actor the anchor axes are swapped, so moving the anchor
    // one cell right in image space shifts the world position one cell DOWN
    // rather than right. (anchor (0,0)->(1,0), transform "90" => delta (0,-1).)
    const main = actorAt("m", "ground", "idle", { x: 0, y: 0 });
    const hero = actorAt("h", "hero", "stand", { x: 2, y: 3 });
    hero.transform = "90";
    const rule = makeRule({ id: "r1", mainActorId: "m", actors: { m: main, h: hero } });

    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 0, y: 0 }, { x: 1, y: 0 }),
    );

    const r = after.hero.rules[0] as Rule;
    expect(r.actors.h.position).to.deep.equal({ x: 2, y: 2 });
  });

  it("keeps the main actor at (0,0) by translating the rest of the rule", () => {
    // The main actor uses the changed appearance. It must stay at the rule
    // origin, so every other actor and the extent shift the opposite way.
    const main = actorAt("m", "hero", "stand", { x: 0, y: 0 });
    const other = actorAt("o", "block", "b", { x: 1, y: 2 });
    const rule = makeRule({ id: "r1", mainActorId: "m", actors: { m: main, o: other } });
    rule.extent = { xmin: 0, xmax: 2, ymin: 0, ymax: 2, ignored: { "1,1": true } };

    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 0, y: 0 }, { x: 1, y: 0 }),
    );

    const r = after.hero.rules[0] as Rule;
    // d = (1, 0), main moved +1 then frame translated -1 => back to origin.
    expect(r.actors.m.position).to.deep.equal({ x: 0, y: 0 });
    // Unaffected actor follows the frame translation (-1, 0).
    expect(r.actors.o.position).to.deep.equal({ x: 0, y: 2 });
    expect(r.extent).to.deep.equal({
      xmin: -1,
      xmax: 1,
      ymin: 0,
      ymax: 2,
      ignored: { "0,1": true },
    });
  });

  it("adjusts move/create offsets so the after-state also stays put", () => {
    const main = actorAt("m", "ground", "idle", { x: 0, y: 0 });
    const hero = actorAt("h", "hero", "stand", { x: 1, y: 1 });
    const rule = makeRule({
      id: "r1",
      mainActorId: "m",
      actors: { m: main, h: hero },
      actions: [
        { type: "move", actorId: "h", offset: { x: 3, y: 0 } },
        {
          type: "create",
          actorId: "new-hero",
          actor: actorAt("new-hero", "hero", "stand", { x: 0, y: 0 }),
          offset: { x: 5, y: 0 },
        },
      ],
    });

    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 0, y: 0 }, { x: 1, y: 0 }),
    );

    const r = after.hero.rules[0] as Rule;
    // main not affected, both targets affected => offsets shift by d = (1, 0).
    expect(r.actors.h.position).to.deep.equal({ x: 2, y: 1 });
    expect((r.actions[0] as { offset: { x: number; y: number } }).offset).to.deep.equal({ x: 4, y: 0 });
    expect((r.actions[1] as { offset: { x: number; y: number } }).offset).to.deep.equal({ x: 6, y: 0 });
  });

  it("does nothing when the anchor did not move", () => {
    const main = actorAt("m", "hero", "stand", { x: 0, y: 0 });
    const rule = makeRule({ id: "r1", mainActorId: "m", actors: { m: main } });
    const before: Characters = { hero: makeCharacter({ id: "hero", rules: [rule] }) };
    const after = reduce(
      before,
      adjustForAppearanceAnchorChange("hero", "stand", { x: 1, y: 1 }, { x: 1, y: 1 }),
    );
    expect(after).to.equal(before);
  });
});
