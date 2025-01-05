import u from "updeep";
import { getCurrentStageForWorld } from "./selectors";
import {
  applyVariableOperation,
  getVariableValue,
  pointByAdding,
  shuffleArray,
  toV2Condition,
} from "./stage-helpers";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "./world-constants";

let IDSeed = Date.now();

function deepClone(obj) {
  if (obj === null) {
    return null;
  }
  if (obj === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(obj));
}

export default function WorldOperator(previousWorld, characters) {
  let stage = null;
  let globals = null;
  let actors = null;
  let input = null;
  let evaluatedRuleIds = {};

  function wrappedPosition({ x, y }) {
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
    stageActor,
    ruleActor,
    conditions,
    stageActorsForReferencedActorId
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

      const possibleValueActors = condition.value.actorId
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
          leftValue = getVariableValue(
            stageActor,
            character,
            condition.variableId
          );
          rightValue = getVariableValue(
            valueActor,
            character,
            condition.variableId
          );
        }
        return comparatorMatches(condition.comparator, leftValue, rightValue);
      });

      if (!matchedValueActor) {
        return false;
      }
    }
    return true;
  }

  function comparatorMatches(comparator, a, b) {
    if (comparator === "=" && `${a}` !== `${b}`) {
      return false;
    }
    if (comparator === ">=" && a / 1 < b / 1) {
      return false;
    }
    if (comparator === "<=" && a / 1 > b / 1) {
      return false;
    }
    return true;
  }

  function actorsAtPosition(position) {
    if (!position) {
      return null;
    }
    return Object.values(actors).filter(
      (a) => a.position.x === position.x && a.position.y === position.y
    );
  }

  function ActorOperator(me) {
    function tickAllRules() {
      const actor = actors[me.id];
      if (!actor) {
        return; // actor was deleted by another rule
      }
      const struct = characters[actor.characterId];
      tickRulesTree(struct);
    }

    function tickRulesTree(struct, behavior = FLOW_BEHAVIORS.FIRST) {
      let rules = [].concat(struct.rules);

      if (behavior === FLOW_BEHAVIORS.RANDOM) {
        rules = shuffleArray(rules);
      }

      // perf note: avoid creating empty evaluatedRuleIds entries if no rules are evaluated

      for (const rule of rules) {
        const applied = tickRule(rule);
        evaluatedRuleIds[me.id] = evaluatedRuleIds[me.id] || {};
        evaluatedRuleIds[me.id][rule.id] = applied;
        evaluatedRuleIds[me.id][struct.id] = applied;
        if (applied && behavior !== FLOW_BEHAVIORS.ALL) {
          break;
        }
      }

      return evaluatedRuleIds[me.id] && evaluatedRuleIds[me.id][struct.id];
    }

    function tickRule(rule) {
      if (rule.type === CONTAINER_TYPES.EVENT) {
        return checkEvent(rule) && tickRulesTree(rule, FLOW_BEHAVIORS.FIRST);
      } else if (rule.type === CONTAINER_TYPES.FLOW) {
        return tickRulesTree(rule, rule.behavior);
      }
      const stageActorsForRuleActorIds = checkRuleScenario(rule);
      if (stageActorsForRuleActorIds) {
        applyRule(rule, stageActorsForRuleActorIds);
        return true;
      }
      return false;
    }

    function checkEvent(trigger) {
      if (trigger.event === "key") {
        return input.keys[trigger.code];
      }
      if (trigger.event === "click") {
        return input.clicks[me.id];
      }
      if (trigger.event === "idle") {
        return true;
      }
      throw new Error(`Unknown trigger event: ${trigger.event}`);
    }

    function checkRuleScenario(rule) {
      const ruleActorsUnmatched = Object.values(rule.actors);

      const stageActorsForRuleActorIds = {};

      for (let x = rule.extent.xmin; x <= rule.extent.xmax; x++) {
        for (let y = rule.extent.ymin; y <= rule.extent.ymax; y++) {
          const ignoreExtraActors = rule.extent.ignored[`${x},${y}`];

          const stageActorsAtPos = actorsAtPosition(
            wrappedPosition(pointByAdding(me.position, { x, y }))
          );

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
          const stageActorsForReferencedActorId = (otherActorId) => {
            if (stageActorsForRuleActorIds[otherActorId]) {
              return stageActorsForRuleActorIds[otherActorId];
            }
            const orule = rule.actors[otherActorId];
            const stagePosition = wrappedPosition(
              pointByAdding(me.position, orule.position)
            );
            if (!stagePosition) {
              return [];
            }
            const ocandidates = actorsAtPosition(stagePosition);
            return ocandidates.filter((ostage) =>
              actorsMatch(
                ostage,
                orule,
                rule.conditions[otherActorId] || {},
                () => false
              )
            );
          };

          const ruleActorsAtPos = ruleActorsUnmatched.filter(
            (r) => r.position.x === x && r.position.y === y
          );

          if (stageActorsAtPos === null) {
            return false; // offscreen?
          }

          if (
            stageActorsAtPos.length !== ruleActorsAtPos.length &&
            !ignoreExtraActors
          ) {
            return false;
          }

          // make sure the stage actors match the rule actors, and the
          // additional conditions also match.
          for (const s of stageActorsAtPos) {
            const idx = ruleActorsUnmatched.findIndex(
              (r) =>
                r.position.x === x &&
                r.position.y === y &&
                actorsMatch(
                  s,
                  r,
                  rule.conditions[r.id] || {},
                  stageActorsForReferencedActorId
                )
            );

            if (idx !== -1) {
              const match = ruleActorsUnmatched[idx];
              stageActorsForRuleActorIds[match.id] = s;
              ruleActorsUnmatched.splice(idx, 1);
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
      return stageActorsForRuleActorIds;
    }

    function getActionAndConditionActorIds(rule) {
      const requiredActorIds = [];
      for (const action of rule.actions) {
        if (action.actorId && rule.actors[action.actorId]) {
          requiredActorIds.push(action.actorId);
        }
      }
      for (const actorId of Object.keys(rule.conditions)) {
        requiredActorIds.push(actorId);
        for (const condition of Object.values(rule.conditions[actorId])) {
          if (condition && condition.value && condition.value.actorId) {
            requiredActorIds.push(condition.value.actorId);
          }
        }
      }

      return requiredActorIds;
    }

    function applyRule(rule, stageActorForId) {
      for (const action of rule.actions) {
        if (action.type === "create") {
          const nextPos = wrappedPosition(
            pointByAdding(me.position, action.offset)
          );
          if (!nextPos) {
            throw new Error(`Action cannot create at this position`);
          }
          const nextID = `a${IDSeed++}`;
          actors[nextID] = Object.assign(deepClone(action.actor), {
            id: nextID,
            position: nextPos,
            variableValues: {},
          });
        } else if (action.actorId) {
          // find the actor on the stage that matches
          const stageActor = stageActorForId[action.actorId];
          if (!stageActor) {
            throw new Error(
              `Action ${JSON.stringify(
                action
              )} references an actor which is not in rule.actors (${
                action.actorId
              }`
            );
          }
          if (action.type === "move") {
            const nextPos = wrappedPosition(
              pointByAdding(stageActor.position, action.delta)
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
            const current = getVariableValue(
              stageActor,
              characters[stageActor.characterId],
              action.variable
            );
            const next = applyVariableOperation(
              current,
              action.operation,
              action.value
            );
            stageActor.variableValues[action.variable] = next;
          } else {
            throw new Error("Not sure how to apply action", action);
          }
        } else if (action.type === "global") {
          const global = globals[action.global];
          global.value = applyVariableOperation(
            global.value,
            action.operation,
            action.value
          );
        } else {
          throw new Error("Not sure how to apply action", action);
        }
      }
    }

    return {
      applyRule,
      checkRuleScenario,
      tickAllRules,
    };
  }

  function resetForRule(rule, { offset, applyActions }) {
    // read-only things
    stage = getCurrentStageForWorld(previousWorld);

    // mutable things
    globals = deepClone(previousWorld.globals);
    actors = {};
    for (const actor of Object.values(rule.actors)) {
      actors[actor.id] = Object.assign(deepClone(actor), {
        position: pointByAdding(actor.position, offset),
      });
    }

    // lay out the before state and apply any rules that apply to
    // the actors currently on the board
    if (applyActions && rule.actions) {
      const operator = ActorOperator(actors[rule.mainActorId]);
      const stageActorsForRuleActorIds = operator.checkRuleScenario(rule);
      if (stageActorsForRuleActorIds) {
        operator.applyRule(rule, stageActorsForRuleActorIds);
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
      previousWorld
    );
  }

  function tick() {
    // read-only things
    stage = getCurrentStageForWorld(previousWorld);
    input = previousWorld.input;

    const historyItem = {
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

    Object.values(actors).forEach((actor) =>
      ActorOperator(actor).tickAllRules()
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
        history: (values) =>
          [].concat(values.slice(values.length - 20), [historyItem]),
      },
      previousWorld
    );
  }

  function untick() {
    const history = previousWorld.history;
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
      previousWorld
    );
  }

  return {
    tick,
    untick,
    resetForRule,
  };
}
