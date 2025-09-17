import u from "updeep";
import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  EvaluatedRuleIds,
  FrameInput,
  Globals,
  HistoryItem,
  Position,
  PositionRelativeToWorld,
  Rule,
  RuleCondition,
  RuleTreeEventItem,
  RuleTreeFlowItem,
  RuleTreeFlowItemAll,
  RuleTreeFlowItemCheck,
  RuleTreeFlowItemFirst,
  RuleTreeFlowItemRandom,
  RuleTreeFlowLoopItem,
  RuleTreeItem,
  Stage,
  VariableComparator,
  WorldMinimal,
} from "../../types";
import { FrameAccumulator } from "./frame-accumulator";
import { getCurrentStageForWorld } from "./selectors";
import {
  actorFillsPoint,
  actorIntersectsExtent,
  applyVariableOperation,
  getVariableValue,
  isNever,
  pointByAdding,
  resolveRuleValue,
  shuffleArray,
} from "./stage-helpers";
import { deepClone, makeId } from "./utils";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "./world-constants";

export default function WorldOperator(previousWorld: WorldMinimal, characters: Characters) {
  let stage: Stage;
  let globals: Globals;
  let actors: { [actorId: string]: Actor };
  let input: FrameInput;
  let evaluatedRuleIds: EvaluatedRuleIds = {};
  let frameAccumulator: FrameAccumulator;

  function wrappedPosition({ x, y }: PositionRelativeToWorld) {
    const o = {
      x: stage.wrapX ? (x + stage.width) % stage.width : x,
      y: stage.wrapY ? (y + stage.height) % stage.height : y,
    };
    if (o.x < 0 || o.y < 0 || o.x >= stage.width || o.y >= stage.height) {
      return null;
    }
    return o;
  }

  type ActorLookupFn = (referencedActorId: string) => Actor[];

  function actorsMatch(
    stageActor: Actor,
    ruleActor: Actor,
    conditions: RuleCondition[],
    stageActorsForId: ActorLookupFn | "avoiding-recursion",
  ) {
    if (ruleActor.characterId !== stageActor.characterId) {
      return false;
    }

    const character = characters[stageActor.characterId];
    const rconditions = conditions.filter(
      (a) =>
        (a.enabled && "actorId" in a.left && a.left.actorId === ruleActor.id) ||
        ("actorId" in a.right && a.right.actorId === ruleActor.id),
    );

    for (const { left, right, comparator } of rconditions) {
      if (("actorId" in left || "actorId" in right) && stageActorsForId === "avoiding-recursion") {
        continue;
      }

      const leftValue: [string | null, Actor | null][] =
        "actorId" in left
          ? (stageActorsForId as ActorLookupFn)(left.actorId).map((actor) => [
              getVariableValue(actor, character, left.variableId),
              actor,
            ])
          : [[resolveRuleValue(left, globals, characters, actors), null]];

      const rightValue: [string | null, Actor | null][] =
        "actorId" in right
          ? (stageActorsForId as ActorLookupFn)(right.actorId).map((actor) => [
              getVariableValue(actor, character, right.variableId),
              actor,
            ])
          : [[resolveRuleValue(right, globals, characters, actors), null]];

      let found = false;
      for (const leftOpt of leftValue) {
        for (const rightOpt of rightValue) {
          if (comparatorMatches(comparator, leftOpt[0], rightOpt[0])) {
            found = true;
          }
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  }

  function comparatorMatches(comparator: VariableComparator, a: string | null, b: string | null) {
    switch (comparator) {
      case "=":
        return `${a}` === `${b}`;
      case "!=":
        return `${a}` != `${b}`;
      case ">=":
        return Number(a) >= Number(b);
      case "<=":
        return Number(a) <= Number(b);
      case "contains":
        if (`${a}`.includes(",")) {
          // This is a special hack for keypress so "ArrowLeft,Space" doesn't match "A"
          return a?.split(",").some((v) => v === b);
        }
        return `${a}`.includes(`${b}`);
      case "ends-with":
        return `${a}`.endsWith(`${b}`);
      case "starts-with":
        return `${a}`.startsWith(`${b}`);
      default:
        isNever(comparator);
    }
  }

  function actorsAtPosition(position: Position | null) {
    if (!position) {
      return null;
    }
    return Object.values(actors).filter(
      (a) => a.position.x === position.x && a.position.y === position.y,
    );
  }

  function ActorOperator(me: Actor) {
    function tickAllRules() {
      const actor = actors[me.id];
      if (!actor) {
        return; // actor was deleted by another rule
      }
      const struct = characters[actor.characterId];
      tickRulesTree(struct);
    }

    function tickRulesTree(
      struct:
        | RuleTreeFlowItemFirst
        | RuleTreeFlowItemRandom
        | RuleTreeFlowItemAll
        | RuleTreeFlowLoopItem
        | RuleTreeEventItem
        | Character,
    ) {
      let rules = [...struct.rules];

      if ("behavior" in struct && struct.behavior === FLOW_BEHAVIORS.RANDOM) {
        rules = shuffleArray(rules);
      }

      // perf note: avoid creating empty evaluatedRuleIds entries if no rules are evaluated
      let iterations = 1;
      if ("behavior" in struct && struct.behavior === FLOW_BEHAVIORS.LOOP) {
        if ("constant" in struct.loopCount && struct.loopCount.constant) {
          iterations = struct.loopCount.constant;
        }
        if ("variableId" in struct.loopCount && struct.loopCount.variableId) {
          const actor = actors[me.id];
          const character = characters[actor.characterId];
          iterations = Number(
            getVariableValue(actor, character, struct.loopCount.variableId) ?? "0",
          );
        }
      }

      for (let ii = 0; ii < iterations; ii++) {
        for (const rule of rules) {
          const applied = tickRule(rule);
          evaluatedRuleIds[me.id] = evaluatedRuleIds[me.id] || {};
          evaluatedRuleIds[me.id][rule.id] ||= applied;
          evaluatedRuleIds[me.id][struct.id] ||= applied;
          if (applied && !("behavior" in struct && struct.behavior === FLOW_BEHAVIORS.ALL)) {
            break;
          }
        }
      }

      return evaluatedRuleIds[me.id] && evaluatedRuleIds[me.id][struct.id];
    }

    function tickRule(rule: RuleTreeItem) {
      if (rule.type === CONTAINER_TYPES.EVENT) {
        return checkEvent(rule) && tickRulesTree(rule);
      } else if (rule.type === CONTAINER_TYPES.FLOW) {
        const checkMet = !rule.check || !!checkRuleScenario(rule.check);
        return checkMet && tickRulesTree(rule);
      }
      const stageActorForId = checkRuleScenario(rule);
      if (stageActorForId) {
        applyRule(rule, { stageActorForId, createActorIds: true });
        return true;
      }
      return false;
    }

    function checkEvent(trigger: RuleTreeEventItem) {
      if (trigger.event === "key") {
        return input.keys[trigger.code!];
      }
      if (trigger.event === "click") {
        return input.clicks[me.id];
      }
      if (trigger.event === "idle") {
        return true;
      }
      throw new Error(`Unknown trigger event: ${trigger}`);
    }

    function checkRuleScenario(
      rule: Rule | NonNullable<RuleTreeFlowItem["check"]>,
    ): { [ruleActorId: string]: Actor } | false {
      const ruleActorsUsed = new Set<string>(); // x-y-ruleactorId
      const stageActorsForRuleActorIds: { [ruleActorId: string]: Actor } = {};

      /** Ben Note: We now allow conditions to specify other actors on the RHS
       * of the equation. This, combined with the fact that you can `ignoreExtraActors`,
       * means there are edge cases (two actors of the same character with different
       * variable values on top of each other) where we need a proper "constraint solver".
       *
       * This is currently a single pass matching system that looks at each square in the rule
       * once. I think we'd need to look at each square, identify posibilities, and then
       * narrow the solution space by evaluating constraints.
       *
       * Since this is such an edge case, I'm implementing a simpler solution:
       *
       * When a condition references another actor at a position, we find stage actors
       * at that position that match (via stageActorsForReferencedActorId) and match
       * if ANY of them meet the condition. Given two conditions on an actor in the same tile,
       * the actor used to match condition 1 may not be the one used to match condition 2.
       *
       * To avoid circular dependencies (eg: Rule 1 says A match B and rule 2 says B match A),
       * we don't evaluate other referential conditions when looking for matches in
       * stageActorsForReferencedActorId. (See () => false passed on 207 below.)
       */
      const stageActorsForReferencedActorId = (otherActorId: string): Actor[] => {
        if (stageActorsForRuleActorIds[otherActorId]) {
          return [stageActorsForRuleActorIds[otherActorId]];
        }
        const oactor = rule.actors[otherActorId];
        const stagePosition = wrappedPosition(pointByAdding(me.position, oactor.position));
        if (!stagePosition) {
          return [];
        }
        const ocandidates = actorsAtPosition(stagePosition);
        if (!ocandidates) {
          return [];
        }
        return ocandidates.filter((ostage) =>
          actorsMatch(ostage, oactor, rule.conditions, "avoiding-recursion"),
        );
      };

      for (let x = rule.extent.xmin; x <= rule.extent.xmax; x++) {
        for (let y = rule.extent.ymin; y <= rule.extent.ymax; y++) {
          const ignoreExtraActors = rule.extent.ignored[`${x},${y}`];

          // Ben Note: `actorFillsPoint` is not "wrapping-aware". If adding the x,y offset
          // causes wrapping, we need to consider actors extending into the offscreen
          // (non-existent) tile and actors at the wrapped tile position.
          const unwrappedStagePos = pointByAdding(me.position, { x, y });
          const wrappedStagePos = wrappedPosition(unwrappedStagePos);
          if (wrappedStagePos === null) {
            return false; // offscreen?
          }
          const stageActorsAtPos = Object.values(actors).filter(
            (actor) =>
              actorFillsPoint(actor, characters, unwrappedStagePos) ||
              actorFillsPoint(actor, characters, wrappedStagePos),
          );
          const ruleActorsAtPos = Object.values(rule.actors).filter(
            (actor) =>
              actorFillsPoint(actor, characters, { x, y }) &&
              !ruleActorsUsed.has(`${actor.id}-${x}-${y}`),
          );
          if (stageActorsAtPos.length !== ruleActorsAtPos.length && !ignoreExtraActors) {
            return false;
          }

          // make sure the stage actors match the rule actors, and the
          // additional conditions also match.
          for (const s of stageActorsAtPos) {
            const match = ruleActorsAtPos.find((r) =>
              actorsMatch(s, r, rule.conditions, stageActorsForReferencedActorId),
            );

            if (match) {
              stageActorsForRuleActorIds[match.id] = s;
              ruleActorsUsed.add(`${match.id}-${wrappedStagePos.x}-${wrappedStagePos.y}`);
            } else if (!ignoreExtraActors) {
              return false;
            }
          }
        }
      }

      // If we didn't find all the actors required for conditions + actions, we failed
      for (const ruleActorId of getActionAndConditionActorIds(rule)) {
        if (!stageActorsForRuleActorIds[ruleActorId]) {
          return false;
        }
      }

      // If any actions call for offsets that are not valid positions on the stage
      // (offscreen and stage doesn't wrap), return false.
      if ("actions" in rule && rule.actions) {
        for (const action of rule.actions) {
          if ("offset" in action && action.offset) {
            const stagePos = wrappedPosition(pointByAdding(me.position, action.offset));
            if (stagePos === null) {
              return false;
            }
          }
        }
      }

      // Re-check conditions - We check the conditions that involve actorIds when
      // matching the rule actors to the stage actors, but we haven't checked
      // global-to-global or global-to-variable style rules yet.
      for (const condition of rule.conditions) {
        const left = resolveRuleValue(
          condition.left,
          globals,
          characters,
          stageActorsForRuleActorIds,
        );
        const right = resolveRuleValue(
          condition.right,
          globals,
          characters,
          stageActorsForRuleActorIds,
        );
        if (!comparatorMatches(condition.comparator, left, right)) {
          return false;
        }
      }

      return stageActorsForRuleActorIds;
    }

    function getActionAndConditionActorIds(rule: Rule | NonNullable<RuleTreeFlowItem["check"]>) {
      const requiredActorIds: string[] = [];

      if ("actions" in rule && rule.actions) {
        for (const action of rule.actions) {
          if ("actorId" in action && rule.actors[action.actorId]) {
            requiredActorIds.push(action.actorId);
          }
        }
      }
      for (const { left, right } of rule.conditions) {
        for (const side of [left, right]) {
          if (!("actorId" in side)) {
            continue;
          }
          const actor = rule.actors[side.actorId];
          if (!actor || !actorIntersectsExtent(actor, characters, rule.extent)) {
            continue;
          }
          requiredActorIds.push(side.actorId);
        }
      }

      return requiredActorIds;
    }

    function applyRule(
      rule: Rule,
      opts: {
        // Mapping between the actors referenced in the rule and the actors present
        // on the stage in the correct scenario positions. Note: this is mutated.
        stageActorForId: { [ruleActorId: string]: Actor };

        // Pass true to give actors created by this rule unique IDs. Pass false to
        // give new actors the IDs that are referenced by the rule actions (to
        // show the rule editor after state.)
        createActorIds: boolean;
      },
    ) {
      const origin = deepClone(me.position);
      const { stageActorForId, createActorIds } = opts;

      for (const action of rule.actions) {
        if (action.type === "create") {
          const nextPos = wrappedPosition(pointByAdding(origin, action.offset));
          if (!nextPos) {
            throw new Error(`Action cannot create at this position`);
          }
          const nextActor = Object.assign(deepClone(action.actor), {
            id: createActorIds ? makeId("actor") : action.actorId,
            position: nextPos,
            variableValues: {},
          });
          frameAccumulator?.push(nextActor);
          actors[nextActor.id] = nextActor;

          // Note: Allow subsequent lookups to use the actor's real new ID on the stage
          // OR the actor's ID within the rule. The latter is important if the rule
          // creates the actor and then moves them, etc.
          stageActorForId[nextActor.id] = nextActor;
          stageActorForId[action.actorId] = nextActor;
        } else if (action.type === "global") {
          const global = globals[action.global];
          global.value = applyVariableOperation(
            global.value,
            action.operation,
            resolveRuleValue(action.value, globals, characters, stageActorForId) ?? "",
          );
        } else if ("actorId" in action && action.actorId) {
          // find the actor on the stage that matches
          const stageActor = stageActorForId[action.actorId];
          if (!stageActor) {
            throw new Error(
              `Action ${JSON.stringify(action)} references an actor which is not in rule.actors (${
                action.actorId
              }. Have: ${JSON.stringify(stageActorForId)}`,
            );
          }
          if (action.type === "move") {
            const nextPos = wrappedPosition(
              "delta" in action
                ? pointByAdding(stageActor.position, action.delta!)
                : pointByAdding(origin, action.offset!),
            );
            if (!nextPos) {
              throw new Error(`Action cannot create at this position`);
            }
            stageActor.position = nextPos;
            frameAccumulator?.push(stageActor);
          } else if (action.type === "delete") {
            delete actors[stageActor.id];
            frameAccumulator?.push({ ...stageActor, deleted: true });
          } else if (action.type === "appearance") {
            stageActor.appearance =
              resolveRuleValue(action.value, globals, characters, stageActorForId) ?? "";
            frameAccumulator?.push(stageActor);
          } else if (action.type === "transform") {
            stageActor.transform = resolveRuleValue(
              action.value,
              globals,
              characters,
              stageActorForId,
            ) as ActorTransform;
            frameAccumulator?.push(stageActor);
          } else if (action.type === "variable") {
            const current =
              getVariableValue(stageActor, characters[stageActor.characterId], action.variable) ??
              "0";
            const next = applyVariableOperation(
              current,
              action.operation,
              resolveRuleValue(action.value, globals, characters, stageActorForId) ?? "",
            );
            stageActor.variableValues[action.variable] = next;
          } else {
            throw new Error(`Not sure how to apply action: ${action}`);
          }
        } else {
          throw new Error(`Not sure how to apply action: ${action}`);
        }
      }
    }

    return {
      applyRule,
      checkRuleScenario,
      tickAllRules,
    };
  }

  function resetForRule(
    rule: Rule | RuleTreeFlowItemCheck,
    { offset, applyActions }: { offset: Position; applyActions: boolean },
  ) {
    // read-only things
    stage = getCurrentStageForWorld(previousWorld)!;

    // mutable things
    globals = deepClone(previousWorld.globals);
    actors = {};
    for (const actor of Object.values(rule.actors)) {
      actors[actor.id] = Object.assign(deepClone(actor), {
        position: pointByAdding(actor.position, offset),
      });
    }

    for (const cond of Object.values(rule.conditions)) {
      if ("globalId" in cond.left && globals[cond.left.globalId]) {
        const value = resolveRuleValue(cond.right, globals, characters, rule.actors);
        if (value) {
          globals[cond.left.globalId].value = value;
        }
      }
    }

    // lay out the before state and apply any rules that apply to
    // the actors currently on the board
    if (applyActions && "actions" in rule && rule.actions) {
      const operator = ActorOperator(actors[rule.mainActorId]);
      operator.applyRule(rule, { createActorIds: false, stageActorForId: { ...actors } });
    }

    return u(
      {
        globals: u.constant(globals),
        stages: {
          [stage.id]: {
            actors: u.constant(actors),
          },
        },
      },
      previousWorld,
    );
  }

  function tick() {
    // read-only things
    stage = getCurrentStageForWorld(previousWorld)!;
    input = previousWorld.input;

    const historyItem: HistoryItem = {
      input: previousWorld.input,
      globals: previousWorld.globals,
      evaluatedRuleIds: previousWorld.evaluatedRuleIds,
      stages: {
        [stage.id]: {
          actors: stage.actors,
        },
      },
    };

    // mutable things
    globals = deepClone(previousWorld.globals);
    globals.keypress = { ...globals.keypress, value: Object.keys(input.keys).join(",") };
    globals.click = { ...globals.click, value: Object.keys(input.clicks)[0] };

    actors = deepClone(stage.actors);
    frameAccumulator = new FrameAccumulator(stage.actors);
    evaluatedRuleIds = {};

    Object.values(actors).forEach((actor) => ActorOperator(actor).tickAllRules());
    const evaluatedSomeRule = Object.values(evaluatedRuleIds).some((actorRuleIds) =>
      Object.values(actorRuleIds).includes(true),
    );

    return u(
      {
        input: u.constant({
          keys: {},
          clicks: {},
        }),
        stages: {
          [stage.id]: {
            actors: u.constant(actors),
          },
        },
        globals: u.constant(globals),
        evaluatedRuleIds: u.constant(evaluatedRuleIds),
        evaluatedTickFrames: frameAccumulator.getFrames(),
        history: (values: HistoryItem[]) =>
          evaluatedSomeRule ? [...values.slice(values.length - 20), historyItem] : values,
      },
      previousWorld,
    );
  }

  function untick() {
    if (!("history" in previousWorld)) {
      throw new Error("This world does not have history state.");
    }
    const history = previousWorld.history as HistoryItem[];
    const historyItem = history[history.length - 1];
    if (!historyItem) {
      return previousWorld;
    }

    const historyStageKey = Object.keys(historyItem.stages)[0];

    return u(
      {
        input: u.constant(historyItem.input),
        globals: u.constant(historyItem.globals),
        stages: {
          [historyStageKey]: {
            actors: u.constant(historyItem.stages[historyStageKey].actors),
          },
        },
        evaluatedRuleIds: u.constant(historyItem.evaluatedRuleIds),
        evaluatedTickFrames: [],
        history: history.slice(0, history.length - 1),
      },
      previousWorld,
    );
  }

  return {
    tick,
    untick,
    resetForRule,
  };
}
