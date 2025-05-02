import u from "updeep";
import {
  Actor,
  Character,
  Characters,
  EvaluatedRuleIds,
  FrameInput,
  Globals,
  HistoryItem,
  MathComparator,
  Position,
  PositionRelativeToWorld,
  Rule,
  RuleCondition,
  RuleTreeEventItem,
  RuleTreeFlowItemAll,
  RuleTreeFlowItemFirst,
  RuleTreeFlowItemRandom,
  RuleTreeFlowLoopItem,
  RuleTreeItem,
  Stage,
  WorldMinimal,
} from "../../types";
import { getCurrentStageForWorld } from "./selectors";
import {
  actorFillsPoint,
  actorIntersectsExtent,
  applyVariableOperation,
  getVariableValue,
  pointByAdding,
  shuffleArray,
  toV2Condition,
} from "./stage-helpers";
import { deepClone } from "./utils";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "./world-constants";

let IDSeed = Date.now();

export default function WorldOperator(previousWorld: WorldMinimal, characters: Characters) {
  let stage: Stage;
  let globals: Globals;
  let actors: { [actorId: string]: Actor };
  let input: FrameInput;
  let evaluatedRuleIds: EvaluatedRuleIds = {};

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

  function actorsMatch(
    stageActor: Actor,
    ruleActor: Actor,
    conditions: { [id: string]: RuleCondition },
    stageActorsForReferencedActorId: (refActorId: string) => Actor[],
  ) {
    if (ruleActor.characterId !== stageActor.characterId) {
      return false;
    }

    const character = characters[stageActor.characterId];

    for (const id of Object.keys(conditions)) {
      const condition = toV2Condition(id, conditions[id]);
      if (!condition || !condition.enabled) {
        continue;
      }

      const possibleValueActors =
        "actorId" in condition.value
          ? stageActorsForReferencedActorId(condition.value.actorId)
          : [ruleActor];

      const matchedValueActor = possibleValueActors.find((valueActor) => {
        let leftValue, rightValue;

        if (condition.type === "appearance") {
          leftValue = stageActor.appearance;
          rightValue = valueActor.appearance;
        } else if (condition.type === "transform") {
          leftValue = stageActor.transform || "none";
          rightValue = valueActor.transform || "none";
        } else {
          leftValue = getVariableValue(stageActor, character, condition.variableId);
          rightValue = getVariableValue(valueActor, character, condition.variableId);
        }
        return comparatorMatches(condition.comparator, leftValue, rightValue);
      });

      if (!matchedValueActor) {
        return false;
      }
    }
    return true;
  }

  function comparatorMatches(
    comparator: MathComparator,
    a: string | number | null,
    b: string | number | null,
  ) {
    if (comparator === "=" && `${a}` !== `${b}`) {
      return false;
    }
    if (comparator === ">=" && Number(a) < Number(b)) {
      return false;
    }
    if (comparator === "<=" && Number(a) > Number(b)) {
      return false;
    }
    return true;
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
          iterations = getVariableValue(actor, character, struct.loopCount.variableId) ?? 0;
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
        return tickRulesTree(rule);
      }
      const stageActorsForRuleActorIds = checkRuleScenario(rule);
      if (stageActorsForRuleActorIds) {
        applyRule(rule, stageActorsForRuleActorIds);
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

    function checkRuleScenario(rule: Rule): { [ruleActorId: string]: Actor } | false {
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
        const orule = rule.actors[otherActorId];
        const stagePosition = wrappedPosition(pointByAdding(me.position, orule.position));
        if (!stagePosition) {
          return [];
        }
        const ocandidates = actorsAtPosition(stagePosition);
        if (!ocandidates) {
          return [];
        }
        return ocandidates.filter((ostage) =>
          actorsMatch(ostage, orule, rule.conditions[otherActorId] || {}, () => []),
        );
      };

      for (let x = rule.extent.xmin; x <= rule.extent.xmax; x++) {
        for (let y = rule.extent.ymin; y <= rule.extent.ymax; y++) {
          const ignoreExtraActors = rule.extent.ignored[`${x},${y}`];

          const stagePos = wrappedPosition(pointByAdding(me.position, { x, y }));
          if (stagePos === null) {
            return false; // offscreen?
          }
          const stageActorsAtPos = Object.values(actors).filter((actor) =>
            actorFillsPoint(actor, characters, stagePos),
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
            const match = ruleActorsAtPos.find((r) => {
              const ruleActorRootPos = wrappedPosition(pointByAdding(me.position, r.position));
              if (!ruleActorRootPos) {
                return false;
              }
              return (
                actorsMatch(s, r, rule.conditions[r.id] || {}, stageActorsForReferencedActorId) &&
                ruleActorRootPos.x === s.position.x &&
                ruleActorRootPos.y === s.position.y
              );
            });

            if (match) {
              stageActorsForRuleActorIds[match.id] = s;
              ruleActorsUsed.add(`${match.id}-${stagePos.x}-${stagePos.y}`);
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

      // If there are global conditions, check those - they can reference the actor
      // variable values, so we need to do this last.
      for (const condition of Object.values(rule.conditions.globals || {})) {
        const leftValue = globals[condition.globalId].value;

        if ("constant" in condition.value && condition.value.constant !== undefined) {
          const rightValue = condition.value.constant;
          if (!comparatorMatches(condition.comparator, leftValue, rightValue)) {
            return false;
          }
        } else if ("actorId" in condition.value && condition.value.actorId) {
          const { actorId, variableId } = condition.value;
          const possibleRightActors = stageActorsForReferencedActorId(actorId);
          const matched = possibleRightActors.some((rightActor) => {
            const rightValue = getVariableValue(
              rightActor,
              characters[rightActor.characterId],
              variableId,
            );
            return comparatorMatches(condition.comparator, leftValue, rightValue);
          });
          if (!matched) {
            return false;
          }
        } else {
          return false;
        }
      }

      return stageActorsForRuleActorIds;
    }

    function getActionAndConditionActorIds(rule: Rule) {
      const requiredActorIds = [];
      for (const action of rule.actions) {
        if ("actorId" in action && rule.actors[action.actorId]) {
          requiredActorIds.push(action.actorId);
        }
      }
      for (const actorId of Object.keys(rule.conditions)) {
        if (actorId === "globals") {
          continue;
        }
        const actor = rule.actors[actorId];
        if (!actor || !actorIntersectsExtent(actor, characters, rule.extent)) {
          continue;
        }
        requiredActorIds.push(actorId);
        for (const condition of Object.values(rule.conditions[actorId])) {
          if (condition && "value" in condition && "actorId" in condition.value) {
            requiredActorIds.push(condition.value.actorId);
          }
        }
      }

      return requiredActorIds;
    }

    function applyRule(rule: Rule, stageActorForId: { [ruleActorId: string]: Actor }) {
      const origin = deepClone(me.position);

      for (const action of rule.actions) {
        if (action.type === "create") {
          const nextPos = wrappedPosition(pointByAdding(origin, action.offset));
          if (!nextPos) {
            throw new Error(`Action cannot create at this position`);
          }
          const nextID = `a${IDSeed++}`;
          actors[nextID] = Object.assign(deepClone(action.actor), {
            id: nextID,
            position: nextPos,
            variableValues: {},
          });
        } else if (action.type === "global") {
          const global = globals[action.global];
          global.value = applyVariableOperation(
            Number(global.value),
            action.operation,
            action.value,
          );
        } else if ("actorId" in action && action.actorId) {
          // find the actor on the stage that matches
          const stageActor = stageActorForId[action.actorId];
          if (!stageActor) {
            throw new Error(
              `Action ${JSON.stringify(action)} references an actor which is not in rule.actors (${
                action.actorId
              }`,
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
          } else if (action.type === "delete") {
            delete actors[stageActor.id];
          } else if (action.type === "appearance") {
            stageActor.appearance = action.to;
          } else if (action.type === "transform") {
            stageActor.transform = action.to;
          } else if (action.type === "variable") {
            const current =
              getVariableValue(stageActor, characters[stageActor.characterId], action.variable) ??
              0;
            const next = applyVariableOperation(current, action.operation, action.value);
            stageActor.variableValues[action.variable] = Number(next);
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
    rule: Rule,
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

    for (const cond of Object.values(rule.conditions.globals || {})) {
      if (!globals[cond.globalId]) {
        continue;
      }
      if ("constant" in cond.value && cond.value.constant !== undefined) {
        globals[cond.globalId].value = cond.value.constant;
      } else if ("actorId" in cond.value && cond.value.actorId) {
        const actor = actors[cond.value.actorId];
        globals[cond.globalId].value =
          getVariableValue(actor, characters[actor.characterId], cond.value.variableId) ?? 0;
      }
    }
    for (const cond of Object.values(rule.conditions.globals || {})) {
      if (!globals[cond.globalId]) {
        continue;
      }
      if ("globalId" in cond.value && cond.value.globalId) {
        globals[cond.globalId].value = globals[cond.value.globalId].value;
      }
    }

    // lay out the before state and apply any rules that apply to
    // the actors currently on the board
    if (applyActions && rule.actions) {
      const operator = ActorOperator(actors[rule.mainActorId]);
      const stageActorsForRuleActorIds = operator.checkRuleScenario(rule);
      if (stageActorsForRuleActorIds) {
        operator.applyRule(rule, stageActorsForRuleActorIds);
      } else {
        console.log(rule);
        console.warn(`Rule was not applied in resetForRule because the scenario check failed.`);
      }
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
    actors = deepClone(stage.actors);
    evaluatedRuleIds = {};

    Object.values(actors).forEach((actor) => ActorOperator(actor).tickAllRules());

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
        history: (values: HistoryItem[]) => [...values.slice(values.length - 20), historyItem],
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
