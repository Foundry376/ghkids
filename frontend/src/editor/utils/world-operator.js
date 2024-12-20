
import {shuffleArray, getVariableValue, applyVariableOperation, pointByAdding} from './stage-helpers';
import {FLOW_BEHAVIORS, CONTAINER_TYPES} from './world-constants';
import {getCurrentStageForWorld} from './selectors';
import u from 'updeep';

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

  function wrappedPosition({x, y}) {
    const o = {
      x: stage.wrapX ? ((x + stage.width) % stage.width) : x,
      y: stage.wrapY ? ((y + stage.height) % stage.height) : y,
    };
    if (o.x < 0 || o.y < 0 || o.x >= stage.width || o.y >= stage.height) {
      return null;
    }
    return o;
  }

  function actorsMatch(actor, other, conditions = {}) {
    if (other.characterId !== actor.characterId) {
      return false;
    }

    for (const id of Object.keys(conditions)) {
      const condition = conditions[id];
      if (!condition.enabled) {
        continue;
      }

      if (id === 'appearance') {
        if (actor.appearance !== other.appearance) {
          return false;
        }
      } else if (id === 'transform') {
        if ((actor.transform || "none") !== (other.transform || "none")) {
          return false;
        }
      } else {
        const actorValue = getVariableValue(actor, characters[actor.characterId], id);
        const otherValue = getVariableValue(other, characters[actor.characterId], id);

        if ((condition.comparator === '=') && (actorValue / 1 !== otherValue / 1)) {
          return false;
        }
        if ((condition.comparator === '>=') && (actorValue / 1 < otherValue / 1)) {
          return false;
        }
        if ((condition.comparator === '<=') && (actorValue / 1 > otherValue / 1)) {
          return false;
        }
      }
    }
    return true;
  }

  function actorsAtPosition(position) {
    if (!position) {
      return null;
    }
    return Object.values(actors).filter((a) =>
      a.position.x === position.x && a.position.y === position.y
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
      } else if (checkRuleScenario(rule)) {
        applyRule(rule);
        return true;
      }
      return false;
    }

    function checkEvent(trigger) {
      if (trigger.event === 'key') {
        return (input.keys[trigger.code]);
      }
      if (trigger.event === 'click') {
        return (input.clicks[me.id]);
      }
      if (trigger.event === 'idle') {
        return true;
      }
      throw new Error(`Unknown trigger event: ${trigger.event}`);
    }

    function checkRuleScenario(rule) {
      const ruleRequiredActorIds = getActionActorIds(rule);
      const ruleUnmatched = Object.values(rule.actors);

      for (let x = rule.extent.xmin; x <= rule.extent.xmax; x ++) {
        for (let y = rule.extent.ymin; y <= rule.extent.ymax; y ++) {
          const ignoreExtraActors = rule.extent.ignored[`${x},${y}`];

          const stagePosition = wrappedPosition(pointByAdding(me.position, {x, y}));
          const ruleActors = ruleUnmatched.filter(r => r.position.x === x && r.position.y === y);
          const stageActors = actorsAtPosition(stagePosition);
          
          if (stageActors === null) {
            return false; // offscreen?
          }

          if (stageActors.length !== ruleActors.length && !ignoreExtraActors) {
            return false;
          }

          // make sure the descriptors on stage satisfy the rule
          for (const s of stageActors) {
            const idx = ruleUnmatched.findIndex(r =>
              r.position.x === x && r.position.y === y && actorsMatch(s, r, rule.conditions[r.id])
            );
            if (idx !== -1) {
              ruleUnmatched.splice(idx, 1);
            } else if (!ignoreExtraActors) {
              return false;
            }
          }
        }
      }
      for (const ruleActor of ruleUnmatched) {
        if (ruleRequiredActorIds[ruleActor.id]) {
          return false;
        }
      }
      return true;
    }

    function getActionActorIds(rule) {
      const requiredActorIds = {};
      for (const action of rule.actions) {
        if (action.actorId && rule.actors[action.actorId]) { requiredActorIds[action.actorId] = true; }
      }
      for (const actorId of Object.keys(rule.conditions)) {
        requiredActorIds[actorId] = true;
      }
      
      return requiredActorIds;
    }

    function applyRule(rule) {
      // step 1: match the actors in the rule to actors on the stage, because
      // they may move and change as we process the actions. We only need the
      // actors that are involved in actions
      const stageActorForId = {};
      for (const ruleActorId of Object.keys(getActionActorIds(rule))) {
        const actionActor = rule.actors[ruleActorId];
        const actionActorConditions = rule.conditions[ruleActorId];

        const stagePosition = wrappedPosition(pointByAdding(me.position, actionActor.position));
        const stageCandidates = actorsAtPosition(stagePosition);
        if (!stageCandidates) {
          throw new Error(`Couldn't apply rule because a generated position was not valid.`);
        }
        const stageActor = stageCandidates.find(a => actorsMatch(a, actionActor, actionActorConditions));
        if (!stageActor) {
          throw new Error(`Couldn't find an actor for performing rule: ${JSON.stringify(rule)}. Candidates: ${JSON.stringify(stageCandidates)}`);
        }
        stageActorForId[ruleActorId] = stageActor;
      }

      for (const action of rule.actions) {
        if (action.type === 'create') {
          const nextID = `a${IDSeed++}`;
          actors[nextID] = Object.assign(deepClone(action.actor), {
            id: nextID,
            position: wrappedPosition(pointByAdding(me.position, action.offset)),
            variableValues: {},
          });
        } else if (action.actorId) {
          // find the actor on the stage that matches
          const stageActor = stageActorForId[action.actorId];
          if (!stageActor) {
            throw new Error(`Action ${JSON.stringify(action)} references an actor which is not in rule.actors (${action.actorId}`);
          }
          if (action.type === 'move') {
            stageActor.position = wrappedPosition(pointByAdding(stageActor.position, action.delta));
          } else if (action.type === 'delete') {
            delete actors[stageActor.id];
          } else if (action.type === 'appearance') {
            stageActor.appearance = action.to;
          } else if (action.type === 'transform') {
            stageActor.transform = action.to;
          } else if (action.type === 'variable') {
            const current = getVariableValue(stageActor, characters[stageActor.characterId], action.variable);
            const next = applyVariableOperation(current, action.operation, action.value);
            stageActor.variableValues[action.variable] = next;
          } else {
            throw new Error("Not sure how to apply action", action);
          }
        } else if (action.type === 'global') {
          const global = globals[action.global];
          global.value = applyVariableOperation(global.value, action.operation, action.value);
        } else {
          throw new Error("Not sure how to apply action", action);
        }
      }
    }

    return {
      applyRule,
      tickAllRules,
    };
  }

  function resetForRule(rule, {offset, applyActions}) {
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
      ActorOperator(actors[rule.mainActorId]).applyRule(rule);
    }

    return u({
      globals: u.constant(globals),
      stages: {
        [stage.id]: {
          actors: u.constant(actors),
        },
      },
    }, previousWorld);
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
        }
      },
    };

    // mutable things
    globals = deepClone(previousWorld.globals);
    actors = deepClone(stage.actors);
    evaluatedRuleIds = {};

    Object.values(actors).forEach(actor =>
      ActorOperator(actor).tickAllRules()
    );

    return u({
      input: u.constant({
        keys: {},
        clicks: {},
      }),
      stages: {
        [stage.id]: {
          actors: u.constant(actors),
        }
      },
      globals: u.constant(globals),
      evaluatedRuleIds: u.constant(evaluatedRuleIds),
      history: (values) => [].concat(values.slice(values.length - 20), [historyItem]),
    }, previousWorld);
  }

  function untick() {
    const history = previousWorld.history;
    const historyItem = history[history.length - 1];
    if (!historyItem) {
      return previousWorld;
    }

    const historyStageKey = Object.keys(historyItem.stages)[0];

    return u({
      input: u.constant(historyItem.input),
      globals: u.constant(historyItem.globals),
      stages: {
        [historyStageKey]: {
          actors: u.constant(historyItem.stages[historyStageKey].actors),
        },
      },
      evaluatedRuleIds: u.constant(historyItem.evaluatedRuleIds),
      history: history.slice(0, history.length - 1),
    }, previousWorld);
  }

  return {
    tick,
    untick,
    resetForRule,
  };
}
