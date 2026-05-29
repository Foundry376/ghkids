import u from "updeep";
import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  EvaluatedCondition,
  EvaluatedRuleDetails,
  EvaluatedRuleDetailsMap,
  EvaluatedSquare,
  FrameInput,
  Globals,
  HistoryItem,
  HistorySnapshot,
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
  StageVariable,
  WorldMinimal,
} from "../../types";
import {
  BUILTIN_STAGE_VARIABLE_IDS,
  getStageHeight,
  getStageVariableValue,
  getStageWidth,
} from "./builtin-stage-variables";
import { DOOR_VARIABLE_IDS } from "./door-constants";
import { FrameAccumulator } from "./frame-accumulator";
import { diff as historyDiffFn, unpatch as historyUnpatch } from "./history-diff";
import { getCurrentStageForWorld } from "./selectors";
import {
  actorFillsPoint,
  actorIntersectsExtent,
  applyTransformOperation,
  applyVariableOperation,
  comparatorMatches,
  getVariableValue,
  pointByAdding,
  resolveRuleValue,
  RuleValueContext,
  shuffleArray,
} from "./stage-helpers";
import { deepClone, makeId } from "./utils";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "./world-constants";

export default function WorldOperator(previousWorld: WorldMinimal, characters: Characters) {
  let stage: Stage;
  let stageVariableValues: Record<string, string>;
  let stageVariables: Record<string, StageVariable>;
  let globals: Globals;
  let actors: { [actorId: string]: Actor };
  let input: FrameInput;
  let evaluatedRuleDetails: EvaluatedRuleDetailsMap = {};
  let frameAccumulator: FrameAccumulator;
  let crossStageActorsForDestStage: { [destStageId: string]: { [actorId: string]: Actor } } = {};

  // Built once per tick/resetForRule. Members are references to the mutable
  // closure state above, so in-place mutations during applyRule are visible
  // through ctx without rebuilding it.
  let ctx: RuleValueContext;

  function wrappedPosition({ x, y }: PositionRelativeToWorld) {
    // World coordinates are 1-indexed (bottom-left = (1, 1)). Wrap relative to
    // the [1, dim] range: shift to 0-based, mod, then shift back. All four
    // stage settings are read through the stage's variableValues map so a
    // rule action that mutates wrap/width/height takes effect mid-tick.
    const wrap = (n: number, d: number) => (((n - 1) % d) + d) % d + 1;
    const stageProps = { variableValues: stageVariableValues };
    const wrapX = getStageVariableValue(BUILTIN_STAGE_VARIABLE_IDS.wrapX, stageVariableValues) === "true";
    const wrapY = getStageVariableValue(BUILTIN_STAGE_VARIABLE_IDS.wrapY, stageVariableValues) === "true";
    const width = getStageWidth(stageProps);
    const height = getStageHeight(stageProps);
    const o = {
      x: wrapX ? wrap(x, width) : x,
      y: wrapY ? wrap(y, height) : y,
    };
    if (o.x < 1 || o.y < 1 || o.x > width || o.y > height) {
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
        a.enabled &&
        (("actorId" in a.left && a.left.actorId === ruleActor.id) ||
          ("actorId" in a.right && a.right.actorId === ruleActor.id)),
    );

    for (const { left, right, comparator } of rconditions) {
      if (("actorId" in left || "actorId" in right) && stageActorsForId === "avoiding-recursion") {
        continue;
      }

      const leftValue: [string | null, Actor | null][] =
        "actorId" in left
          ? (stageActorsForId as ActorLookupFn)(left.actorId).map((actor) => [
              getVariableValue(actor, character, left.variableId, comparator),
              actor,
            ])
          : [[resolveRuleValue(left, comparator, actors, ctx), null]];

      const rightValue: [string | null, Actor | null][] =
        "actorId" in right
          ? (stageActorsForId as ActorLookupFn)(right.actorId).map((actor) => [
              getVariableValue(actor, character, right.variableId, comparator),
              actor,
            ])
          : [[resolveRuleValue(right, comparator, actors, ctx), null]];

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

      // perf note: avoid creating empty evaluatedRuleDetails entries if no rules are evaluated
      let iterations = 1;
      if ("behavior" in struct && struct.behavior === FLOW_BEHAVIORS.LOOP) {
        if ("constant" in struct.loopCount && struct.loopCount.constant) {
          iterations = struct.loopCount.constant;
        }
        if ("variableId" in struct.loopCount && struct.loopCount.variableId) {
          const actor = actors[me.id];
          const character = characters[actor.characterId];
          iterations = Number(
            getVariableValue(actor, character, struct.loopCount.variableId, "=") ?? "0",
          );
        }
      }

      let anyApplied = false;
      for (let ii = 0; ii < iterations; ii++) {
        for (const rule of rules) {
          const details = tickRule(rule);

          // Store details for this rule - always update to avoid stale data
          evaluatedRuleDetails[me.id] = evaluatedRuleDetails[me.id] || {};
          evaluatedRuleDetails[me.id][rule.id] = details;

          if (details.passed) {
            anyApplied = true;
          }
          if (details.passed && !("behavior" in struct && struct.behavior === FLOW_BEHAVIORS.ALL)) {
            break;
          }
        }
      }

      // Store container-level details (simplified - just tracks if any child passed)
      if ("id" in struct) {
        evaluatedRuleDetails[me.id] = evaluatedRuleDetails[me.id] || {};
        evaluatedRuleDetails[me.id][struct.id] = {
          passed: anyApplied,
          conditions: [],
          squares: [],
          matchedActors: {},
        };
      }

      return anyApplied;
    }

    function tickRule(rule: RuleTreeItem): EvaluatedRuleDetails {
      const emptyDetails: EvaluatedRuleDetails = {
        passed: false,
        conditions: [],
        squares: [],
        matchedActors: {},
      };

      // Skip disabled rules
      if (rule.enabled === false) {
        return emptyDetails;
      }

      if (rule.type === CONTAINER_TYPES.EVENT) {
        const eventPassed = checkEvent(rule);
        if (!eventPassed) {
          return emptyDetails;
        }
        const childrenApplied = tickRulesTree(rule);
        return { ...emptyDetails, passed: childrenApplied };
      } else if (rule.type === CONTAINER_TYPES.FLOW) {
        if (rule.check) {
          const checkResult = checkRuleScenario(rule.check);
          if (!checkResult.passed) {
            return checkResult.details;
          }
        }
        const childrenApplied = tickRulesTree(rule);
        return { ...emptyDetails, passed: childrenApplied };
      }

      // Actual rule evaluation
      const result = checkRuleScenario(rule);
      if (result.passed && result.stageActorForId) {
        applyRule(rule, { stageActorForId: result.stageActorForId, createActorIds: true });
      }
      return result.details;
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
      throw new Error(`Unknown trigger event: ${trigger.event}`);
    }

    type CheckRuleScenarioResult = {
      passed: boolean;
      stageActorForId: { [ruleActorId: string]: Actor } | null;
      details: EvaluatedRuleDetails;
    };

    function checkRuleScenario(
      rule: Rule | NonNullable<RuleTreeFlowItem["check"]>,
    ): CheckRuleScenarioResult {
      const ruleActorsUsed = new Set<string>(); // x-y-ruleactorId
      const stageActorsForRuleActorIds: { [ruleActorId: string]: Actor } = {};

      // Initialize details tracking
      const squares: EvaluatedSquare[] = [];
      const conditions: EvaluatedCondition[] = [];
      let failedAt: EvaluatedRuleDetails["failedAt"] | undefined;

      const makeFailResult = (
        reason: EvaluatedRuleDetails["failedAt"],
      ): CheckRuleScenarioResult => ({
        passed: false,
        stageActorForId: null,
        details: {
          passed: false,
          failedAt: reason,
          squares,
          conditions,
          matchedActors: Object.fromEntries(
            Object.entries(stageActorsForRuleActorIds).map(([k, v]) => [k, v.id]),
          ),
        },
      });

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
        if (!oactor) {
          return []; // this seems it should not happen
        }
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

          // Square coordinates are 0-based relative to the extent origin so that
          // the overlay renderer can position them with extentXMin + sq.x/y.
          const sx = x - rule.extent.xmin;
          const sy = y - rule.extent.ymin;

          // Ben Note: `actorFillsPoint` is not "wrapping-aware". If adding the x,y offset
          // causes wrapping, we need to consider actors extending into the offscreen
          // (non-existent) tile and actors at the wrapped tile position.
          const unwrappedStagePos = pointByAdding(me.position, { x, y });
          const wrappedStagePos = wrappedPosition(unwrappedStagePos);
          if (wrappedStagePos === null) {
            squares.push({ x: sx, y: sy, passed: false, reason: "offscreen" });
            if (!failedAt) failedAt = "extent-square";
            continue; // Continue to collect all square results
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
            squares.push({
              x: sx,
              y: sy,
              passed: false,
              reason: "actor-count-mismatch",
              expectedActorCount: ruleActorsAtPos.length,
              actualActorCount: stageActorsAtPos.length,
            });
            if (!failedAt) failedAt = "extent-square";
            continue; // Continue to collect all square results
          }

          // Match stage actors to rule actors using two-phase matching:
          //
          // Phase 1 (full match): Use actorsMatch which checks character AND conditions.
          // This is needed to disambiguate when multiple actors of the same character
          // exist in a rule (e.g., two zombies with different appearances). Conditions
          // help determine which stage actor corresponds to which rule actor.
          //
          // Phase 2 (character-only fallback): If no full match, try matching by
          // character only. This provides better UI feedback - squares show green when
          // the right character is present, even if conditions fail. Conditions are
          // then evaluated separately and shown with their own status indicators.
          // For actual rule execution, the full match is still required.
          let squarePassed = true;
          for (const s of stageActorsAtPos) {
            let match = ruleActorsAtPos.find((r) =>
              actorsMatch(s, r, rule.conditions, stageActorsForReferencedActorId),
            );

            if (!match) {
              match = ruleActorsAtPos.find(
                (r) =>
                  r.characterId === s.characterId &&
                  !ruleActorsUsed.has(`${r.id}-${wrappedStagePos.x}-${wrappedStagePos.y}`),
              );
            }

            if (match) {
              stageActorsForRuleActorIds[match.id] = s;
              ruleActorsUsed.add(`${match.id}-${wrappedStagePos.x}-${wrappedStagePos.y}`);
            } else if (!ignoreExtraActors) {
              squarePassed = false;
            }
          }

          if (squarePassed) {
            squares.push({ x: sx, y: sy, passed: true, reason: "ok" });
          } else {
            squares.push({
              x: sx,
              y: sy,
              passed: false,
              reason: "actor-match-failed",
              expectedActorCount: ruleActorsAtPos.length,
              actualActorCount: stageActorsAtPos.length,
            });
            if (!failedAt) failedAt = "extent-square";
          }
        }
      }

      // Check if we found all the actors required for conditions + actions
      let hasMissingRequiredActor = false;
      if (failedAt !== "extent-square") {
        for (const ruleActorId of getActionAndConditionActorIds(rule)) {
          if (!stageActorsForRuleActorIds[ruleActorId]) {
            hasMissingRequiredActor = true;
            if (!failedAt) failedAt = "missing-required-actor";
            break;
          }
        }
      }

      // Check if any actions call for offsets that are not valid positions on the stage
      if (!failedAt && "actions" in rule && rule.actions) {
        for (const action of rule.actions) {
          if ("offset" in action && action.offset) {
            const stagePos = wrappedPosition(pointByAdding(me.position, action.offset));
            if (stagePos === null) {
              failedAt = "action-offset-invalid";
              break;
            }
          }
        }
      }

      // Evaluate all conditions for detailed feedback.
      // This allows us to show which specific conditions passed/failed.
      // We need matched actors to resolve condition values, so skip if we couldn't match actors.
      if (!hasMissingRequiredActor) {
        for (const condition of rule.conditions) {
          if (!condition.enabled) continue;

          const left = resolveRuleValue(
            condition.left,
            condition.comparator,
            stageActorsForRuleActorIds,
            ctx,
          );
          const right = resolveRuleValue(
            condition.right,
            condition.comparator,
            stageActorsForRuleActorIds,
            ctx,
          );
          const passed = comparatorMatches(condition.comparator, left, right);
          conditions.push({
            conditionKey: condition.key,
            passed,
            leftValue: left,
            rightValue: right,
          });
          if (!passed && !failedAt) {
            failedAt = "condition-failed";
          }
        }
      }

      // Return failure if anything failed
      if (failedAt) {
        return makeFailResult(failedAt);
      }

      return {
        passed: true,
        stageActorForId: stageActorsForRuleActorIds,
        details: {
          passed: true,
          squares,
          conditions,
          matchedActors: Object.fromEntries(
            Object.entries(stageActorsForRuleActorIds).map(([k, v]) => [k, v.id]),
          ),
        },
      };
    }

    function getActionAndConditionActorIds(rule: Rule | NonNullable<RuleTreeFlowItem["check"]>) {
      const requiredActorIds: string[] = [];

      if ("actions" in rule && rule.actions) {
        for (const action of rule.actions) {
          if ("actorId" in action && rule.actors[action.actorId]) {
            requiredActorIds.push(action.actorId);
          }
          if (action.type === "teleport" && rule.actors[action.doorActorId]) {
            requiredActorIds.push(action.doorActorId);
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

      rule.actions.forEach((action, actionIdx) => {
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
          frameAccumulator?.push({ ...nextActor, actionIdx });
          actors[nextActor.id] = nextActor;

          // Note: Allow subsequent lookups to use the actor's real new ID on the stage
          // OR the actor's ID within the rule. The latter is important if the rule
          // creates the actor and then moves them, etc.
          stageActorForId[nextActor.id] = nextActor;
          stageActorForId[action.actorId] = nextActor;
        } else if (action.type === "global") {
          const global = globals[action.global];
          if (!global) {
            // Global was deleted - skip this action
            return;
          }
          global.value = applyVariableOperation(
            global.value,
            action.operation,
            resolveRuleValue(action.value, "=", stageActorForId, ctx) ??
              "",
          );
        } else if (action.type === "stageVariable") {
          if (!stageVariables[action.stageVariable]) {
            // Stage variable was deleted - skip this action
            return;
          }
          const current = getStageVariableValue(action.stageVariable, stageVariableValues);
          const value =
            resolveRuleValue(action.value, "=", stageActorForId, ctx) ??
            "";
          stageVariableValues[action.stageVariable] = applyVariableOperation(
            current,
            action.operation,
            value,
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
              // Move would go offscreen on a non-wrapping stage - skip this action
              // This can happen with delta-based moves that can't be validated upfront
              return;
            }
            stageActor.position = nextPos;
            if (action.animationStyle !== "skip") {
              frameAccumulator?.push({
                ...stageActor,
                actionIdx,
                animationStyle: action.animationStyle,
              });
            }
          } else if (action.type === "teleport") {
            const door = stageActorForId[action.doorActorId];
            if (!door) {
              return;
            }
            const doorCharacter = characters[door.characterId];
            if (doorCharacter?.kind !== "door") {
              return;
            }
            const destXStr = getVariableValue(door, doorCharacter, DOOR_VARIABLE_IDS.destinationX, "=");
            const destYStr = getVariableValue(door, doorCharacter, DOOR_VARIABLE_IDS.destinationY, "=");
            const destStageRaw =
              getVariableValue(door, doorCharacter, DOOR_VARIABLE_IDS.destinationStage, "=") ?? "";

            const destX = Number(destXStr);
            const destY = Number(destYStr);
            if (!Number.isFinite(destX) || !Number.isFinite(destY)) {
              return;
            }
            const destStageId = destStageRaw || stage.id;

            if (destStageId === stage.id) {
              stageActor.position = { x: destX, y: destY };
              frameAccumulator?.push({ ...stageActor, actionIdx, animationStyle: "none" });
            } else {
              const destStage = previousWorld.stages[destStageId];
              if (!destStage) {
                return;
              }
              crossStageActorsForDestStage[destStageId] =
                crossStageActorsForDestStage[destStageId] ?? deepClone(destStage.actors);
              const teleported: Actor = {
                ...stageActor,
                position: { x: destX, y: destY },
              };
              crossStageActorsForDestStage[destStageId][stageActor.id] = teleported;
              delete actors[stageActor.id];
              delete stageActorForId[action.actorId];
            }
          } else if (action.type === "delete") {
            delete actors[stageActor.id];
            if (action.animationStyle !== "skip") {
              frameAccumulator?.push({
                ...stageActor,
                actionIdx,
                deleted: true,
                animationStyle: action.animationStyle,
              });
            }
          } else if (action.type === "appearance") {
            stageActor.appearance =
              resolveRuleValue(action.value, "=", stageActorForId, ctx) ??
              "";
            if (action.animationStyle !== "skip") {
              frameAccumulator?.push({
                ...stageActor,
                actionIdx,
                animationStyle: action.animationStyle,
              });
            }
          } else if (action.type === "transform") {
            const value = resolveRuleValue(
              action.value,
              "=",
              stageActorForId,
              ctx,
            ) as ActorTransform;
            const next = applyTransformOperation(
              stageActor.transform ?? "0",
              action.operation ?? "set",
              value,
            );
            stageActor.transform = next;
            if (action.animationStyle !== "skip") {
              frameAccumulator?.push({
                ...stageActor,
                actionIdx,
                animationStyle: action.animationStyle,
              });
            }
          } else if (action.type === "variable") {
            const current =
              getVariableValue(
                stageActor,
                characters[stageActor.characterId],
                action.variable,
                "=",
              ) ?? "0";
            const value =
              resolveRuleValue(action.value, "=", stageActorForId, ctx) ??
              "";
            const next = applyVariableOperation(current, action.operation, value);

            if (action.variable === "x" || action.variable === "y") {
              const numValue = Number(next);
              if (!isNaN(numValue)) {
                const coord = action.variable as "x" | "y";
                const wrappedPos = wrappedPosition({
                  ...stageActor.position,
                  [coord]: numValue,
                });
                if (wrappedPos) {
                  stageActor.position = wrappedPos;
                }
              }
            } else {
              stageActor.variableValues[action.variable] = next;
            }
          } else {
            throw new Error(`Not sure how to apply action: ${action}`);
          }
        } else {
          throw new Error(`Not sure how to apply action: ${action}`);
        }
      });
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
    const currentStage = getCurrentStageForWorld(previousWorld);
    if (!currentStage) {
      // No stages exist - return world unchanged
      return previousWorld;
    }
    stage = currentStage;

    // mutable things
    globals = deepClone(previousWorld.globals);
    stageVariables = deepClone(previousWorld.stageVariables);
    stageVariableValues = deepClone(currentStage.variableValues);
    ctx = { globals, characters, stageVariables, stage: { variableValues: stageVariableValues } };
    actors = {};
    for (const actor of Object.values(rule.actors)) {
      actors[actor.id] = Object.assign(deepClone(actor), {
        position: pointByAdding(actor.position, offset),
      });
    }

    for (const cond of Object.values(rule.conditions)) {
      if ("globalId" in cond.left && globals[cond.left.globalId]) {
        const value = resolveRuleValue(cond.right, cond.comparator, rule.actors, ctx);
        if (value) {
          globals[cond.left.globalId].value = value;
        }
      }
      if ("stageVariableId" in cond.left && stageVariables[cond.left.stageVariableId]) {
        const value = resolveRuleValue(cond.right, cond.comparator, rule.actors, ctx);
        if (value) {
          stageVariableValues[cond.left.stageVariableId] = value;
        }
      }
    }

    frameAccumulator = new FrameAccumulator(actors);
    crossStageActorsForDestStage = {};

    // lay out the before state and apply any rules that apply to
    // the actors currently on the board
    if (applyActions && "actions" in rule && rule.actions) {
      const operator = ActorOperator(actors[rule.mainActorId]);
      operator.applyRule(rule, { createActorIds: false, stageActorForId: { ...actors } });
    }

    const stageUpdates: Record<string, { actors: unknown; variableValues?: unknown }> = {
      [stage.id]: {
        actors: u.constant(actors),
        variableValues: u.constant(stageVariableValues),
      },
    };
    for (const [destStageId, destActors] of Object.entries(crossStageActorsForDestStage)) {
      stageUpdates[destStageId] = { actors: u.constant(destActors) };
    }

    return u(
      {
        globals: u.constant(globals),
        stages: stageUpdates,
        evaluatedTickFrames: frameAccumulator.getFrames(),
      },
      previousWorld,
    );
  }

  function tick(options: { clearInput?: boolean } = {}) {
    // read-only things
    const currentStage = getCurrentStageForWorld(previousWorld);
    if (!currentStage) {
      // No stages exist - return world unchanged
      return previousWorld;
    }
    stage = currentStage;
    input = previousWorld.input;

    // mutable things
    globals = deepClone(previousWorld.globals);
    globals.keypress = { ...globals.keypress, value: Object.keys(input.keys).join(",") };
    globals.click = { ...globals.click, value: Object.keys(input.clicks)[0] };
    stageVariables = deepClone(previousWorld.stageVariables);
    stageVariableValues = deepClone(stage.variableValues);
    ctx = { globals, characters, stageVariables, stage: { variableValues: stageVariableValues } };

    actors = deepClone(stage.actors);
    frameAccumulator = new FrameAccumulator(stage.actors);
    evaluatedRuleDetails = {};
    crossStageActorsForDestStage = {};

    Object.values(actors).forEach((actor) => ActorOperator(actor).tickAllRules());
    const evaluatedSomeRule = Object.values(evaluatedRuleDetails).some((actorRuleDetails) =>
      Object.values(actorRuleDetails).some((details) => details.passed),
    );

    const beforeStages: HistorySnapshot["stages"] = {
      [stage.id]: { actors: stage.actors, variableValues: stage.variableValues },
    };
    const afterStages: HistorySnapshot["stages"] = {
      [stage.id]: { actors, variableValues: stageVariableValues },
    };
    for (const [destStageId, destActors] of Object.entries(crossStageActorsForDestStage)) {
      const destStage = previousWorld.stages[destStageId];
      if (!destStage) continue; // teleport only populates dests for stages that exist
      // Rules only mutate the current stage's variableValues; cross-stage
      // teleports just move actors, so before and after share the same
      // variableValues here.
      beforeStages[destStageId] = {
        actors: destStage.actors,
        variableValues: destStage.variableValues,
      };
      afterStages[destStageId] = {
        actors: destActors,
        variableValues: destStage.variableValues,
      };
    }

    const beforeSnapshot: HistorySnapshot = {
      input: previousWorld.input,
      globals: previousWorld.globals,
      evaluatedRuleDetails: previousWorld.evaluatedRuleDetails,
      stages: beforeStages,
    };

    const afterSnapshot: HistorySnapshot = {
      input: options.clearInput ? { keys: {}, clicks: {} } : previousWorld.input,
      globals,
      evaluatedRuleDetails,
      stages: afterStages,
    };

    // Compute a compact diff (delta) instead of storing a full snapshot.
    // The delta records only what changed between before and after, and can
    // be used with unpatch() to reconstruct the before state.
    const historyDelta = historyDiffFn(
      beforeSnapshot as unknown as Record<string, unknown>,
      afterSnapshot as unknown as Record<string, unknown>,
    );

    const stageUpdates: Record<string, { actors: unknown; variableValues?: unknown }> = {
      [stage.id]: {
        actors: u.constant(actors),
        variableValues: u.constant(stageVariableValues),
      },
    };
    for (const [destStageId, destActors] of Object.entries(crossStageActorsForDestStage)) {
      stageUpdates[destStageId] = { actors: u.constant(destActors) };
    }

    const updates: Record<string, unknown> = {
      stages: stageUpdates,
      globals: u.constant(globals),
      evaluatedRuleDetails: u.constant(evaluatedRuleDetails),
      evaluatedTickFrames: frameAccumulator.getFrames(),
      history: (values: HistoryItem[]) =>
        evaluatedSomeRule && historyDelta
          ? [...values.slice(values.length - 500), historyDelta]
          : values,
    };

    if (options.clearInput) {
      updates.input = u.constant({ keys: {}, clicks: {} });
    }

    return u(updates, previousWorld);
  }

  function untick() {
    if (!("history" in previousWorld)) {
      throw new Error("This world does not have history state.");
    }
    const history = previousWorld.history as HistoryItem[];
    const delta = history[history.length - 1];
    if (!delta) {
      return previousWorld;
    }

    // Reconstruct the previous state by applying the reverse diff to the current state.
    const currentStage = getCurrentStageForWorld(previousWorld)!;
    const currentSnapshot: HistorySnapshot = {
      input: previousWorld.input,
      globals: previousWorld.globals,
      evaluatedRuleDetails: previousWorld.evaluatedRuleDetails,
      stages: {
        [currentStage.id]: {
          actors: currentStage.actors,
          variableValues: currentStage.variableValues,
        },
      },
    };

    const previousSnapshot = historyUnpatch(
      currentSnapshot as unknown as Record<string, unknown>,
      delta,
    ) as unknown as HistorySnapshot;
    const stageKey = Object.keys(previousSnapshot.stages)[0];

    return u(
      {
        input: u.constant(previousSnapshot.input),
        globals: u.constant(previousSnapshot.globals),
        stages: {
          [stageKey]: {
            actors: u.constant(previousSnapshot.stages[stageKey].actors),
            variableValues: u.constant(previousSnapshot.stages[stageKey].variableValues),
          },
        },
        evaluatedRuleDetails: u.constant(previousSnapshot.evaluatedRuleDetails),
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
