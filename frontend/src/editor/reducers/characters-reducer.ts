import u from "updeep";

import {
  Actor,
  Character,
  Characters,
  EditorState,
  Position,
  Rule,
  RuleTreeEventItem,
  RuleTreeFlowItemCheck,
  RuleTreeItem,
  RuleValue,
} from "../../types";
import { Actions } from "../actions";
import { ruleFromRecordingState } from "../components/stage/recording/utils";
import * as Types from "../constants/action-types";
import { extentByShiftingExtent } from "../utils/recording-helpers";
import { getCurrentStageForWorld } from "../utils/selectors";
import { findRule, pointByAdding, positionDeltaForAnchorChange } from "../utils/stage-helpers";
import { deepClone, makeId } from "../utils/utils";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "../utils/world-constants";
import initialState from "./initial-state";

export default function charactersReducer(
  state = initialState.characters,
  action: Actions,
  { recording }: EditorState,
) {
  switch (action.type) {
    case Types.UPSERT_CHARACTER: {
      return u.updateIn(action.characterId, action.values, state);
    }

    case Types.DELETE_CHARACTER: {
      return scrubCharacterFromCharacters(state, action.characterId);
    }

    case Types.DELETE_GLOBAL: {
      return scrubGlobalFromCharacters(state, action.globalId);
    }

    case Types.DELETE_STAGE_VARIABLE: {
      return scrubStageVariableFromCharacters(state, action.stageVariableId);
    }

    case Types.CREATE_CHARACTER_VARIABLE: {
      return u.updateIn(
        action.characterId,
        {
          variables: {
            [action.variableId]: {
              defaultValue: "0",
              name: "Untitled",
              id: action.variableId,
            },
          },
        } as Pick<Character, "variables">,
        state,
      );
    }

    case Types.DELETE_CHARACTER_VARIABLE: {
      const scrubbed = scrubCharacterVariableFromCharacters(
        state,
        action.characterId,
        action.variableId,
      );
      return u.updateIn(
        action.characterId,
        {
          variables: u.omit(action.variableId),
        },
        scrubbed,
      );
    }

    case Types.DELETE_CHARACTER_APPEARANCE: {
      return u.updateIn(
        action.characterId,
        {
          spritesheet: {
            appearances: u.omit(action.appearanceId),
            appearanceNames: u.omit(action.appearanceId),
          },
        },
        state,
      );
    }

    case Types.ADJUST_FOR_APPEARANCE_ANCHOR_CHANGE: {
      const { prevAnchor, nextAnchor } = action;
      if (prevAnchor.x === nextAnchor.x && prevAnchor.y === nextAnchor.y) {
        return state;
      }
      return forEachRuleItem(state, (item) => {
        const container = ruleContainer(item);
        if (!container) return;
        adjustContainerForAnchorChange(
          container,
          action.characterId,
          action.appearanceId,
          prevAnchor,
          nextAnchor,
        );
      });
    }

    case Types.CREATE_CHARACTER_EVENT_CONTAINER: {
      const { characterId, eventType, eventCode, id } = action;
      if (!state[characterId]) {
        return state;
      }
      let rules: RuleTreeItem[] = deepClone(state[characterId].rules);
      const hasSameAlready = rules.some(
        (r) => "event" in r && r.event === eventType && r.code === eventCode,
      );
      const hasEvents = rules.some((r) => "event" in r);

      if (hasSameAlready) {
        return state;
      }

      const rule: RuleTreeEventItem = {
        id: id,
        type: CONTAINER_TYPES.EVENT,
        rules: [],
        event: eventType,
        code: eventCode,
      };

      if (!hasEvents) {
        rules = [
          rule,
          {
            id: id + 1,
            type: CONTAINER_TYPES.EVENT,
            rules: rules,
            event: "idle" as const,
          },
        ];
      } else {
        rules.unshift(rule);
      }
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.CREATE_CHARACTER_FLOW_CONTAINER: {
      const { characterId, id } = action;
      if (!state[characterId]) {
        return state;
      }
      const rules = deepClone(state[characterId].rules);

      const idleContainer = rules.find(
        (r) => "event" in r && r.event === "idle",
      ) as RuleTreeEventItem;
      const rulesWithinIdle: RuleTreeItem[] = idleContainer ? idleContainer.rules : rules;

      rulesWithinIdle.push({
        id,
        behavior: FLOW_BEHAVIORS.FIRST,
        name: "Untitled Group",
        type: CONTAINER_TYPES.FLOW,
        rules: [],
      });
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.FINISH_RECORDING: {
      if (!state[recording.characterId!]) {
        return state;
      }
      const rules = deepClone(state[recording.characterId!].rules);

      // locate the main actor in the recording to "re-center" the extent to it
      const beforeStage = getCurrentStageForWorld(recording.beforeWorld);
      if (!beforeStage) {
        return state;
      }
      const recordedRule = ruleFromRecordingState(beforeStage, state, recording);
      if (!recordedRule) {
        return state;
      }

      if (recording.ruleId) {
        if (recording.ruleId.endsWith("-check")) {
          const ruleId = recording.ruleId.replace("-check", "");
          const [existingRule, parentRule, parentIdx] = findRule({ rules }, ruleId);
          if (!existingRule || !("check" in existingRule)) {
            return state;
          }
          const check: RuleTreeFlowItemCheck = Object.assign({}, existingRule.check, {
            mainActorId: recordedRule.mainActorId,
            conditions: recordedRule.conditions,
            actors: recordedRule.actors,
            extent: recordedRule.extent,
          });
          parentRule.rules[parentIdx] = Object.assign({}, existingRule, { check });
        } else {
          const [existingRule, parentRule, parentIdx] = findRule({ rules }, recording.ruleId);
          if (!existingRule) return state;
          parentRule.rules[parentIdx] = Object.assign({}, existingRule, recordedRule);
        }

        return u.updateIn(recording.characterId, { rules }, state);
      }

      const idleContainer = rules.find(
        (r) => "event" in r && r.event === "idle",
      ) as RuleTreeEventItem;
      const rulesWithinIdle: RuleTreeItem[] = idleContainer ? idleContainer.rules : rules;

      rulesWithinIdle.unshift({ ...recordedRule, id: makeId("rule"), name: "Untitled Rule" });
      return u.updateIn(recording.characterId, { rules }, state);
    }
    default:
      return state;
  }
}

/**
 * Walks every rule tree node in every character, invoking `visit` on each.
 * The visitor receives the item and the id of the character that owns it
 * (relevant for things like loop counts that resolve against that character).
 * `state` is deep-cloned up front so visitors can mutate freely.
 */
function forEachRuleItem(
  state: Characters,
  visit: (item: RuleTreeItem, ownerCharacterId: string) => void,
): Characters {
  const next = deepClone(state);
  const walk = (item: RuleTreeItem, ownerCharacterId: string) => {
    visit(item, ownerCharacterId);
    if ("rules" in item) {
      for (const child of item.rules) {
        walk(child, ownerCharacterId);
      }
    }
  };
  for (const id of Object.keys(next)) {
    for (const rule of next[id].rules) {
      walk(rule, id);
    }
  }
  return next;
}

function ruleContainer(item: RuleTreeItem): Rule | RuleTreeFlowItemCheck | undefined {
  return item.type === "rule" ? item : item.type === "group-flow" ? item.check : undefined;
}

const ZERO_DELTA: Position = { x: 0, y: 0 };

/**
 * An action offset is stored relative to the main actor's start position, so it
 * has to move with both the target actor's anchor change (`targetDelta`, to hold
 * the "after" artwork still) and the main actor's anchor change (`mainDelta`,
 * because the frame it is measured against moved). Returns the adjusted offset.
 */
function shiftActionOffset(offset: Position, targetDelta: Position, mainDelta: Position): Position {
  const ox = targetDelta.x - mainDelta.x;
  const oy = targetDelta.y - mainDelta.y;
  return ox === 0 && oy === 0 ? offset : { x: offset.x + ox, y: offset.y + oy };
}

/**
 * Shift every actor / action / extent in one rule (or flow check) so that the
 * artwork drawn with `appearanceId` of `characterId` stays in the same squares
 * after its anchor moved from `prevAnchor` to `nextAnchor`. Each affected actor
 * is shifted by its own (transform-aware) delta. See
 * `adjustForAppearanceAnchorChange`.
 */
function adjustContainerForAnchorChange(
  container: Rule | RuleTreeFlowItemCheck,
  characterId: string,
  appearanceId: string,
  prevAnchor: Position,
  nextAnchor: Position,
) {
  const usesAppearance = (a: Pick<Actor, "characterId" | "appearance">) =>
    a.characterId === characterId && a.appearance === appearanceId;
  const deltaFor = (a: Pick<Actor, "characterId" | "appearance" | "transform">) =>
    usesAppearance(a) ? positionDeltaForAnchorChange(prevAnchor, nextAnchor, a.transform) : ZERO_DELTA;

  const mainActor = container.actors[container.mainActorId];
  const mainDelta = mainActor ? deltaFor(mainActor) : ZERO_DELTA;

  // Phase 1: shift the "before" position of each affected actor so its filled
  // squares stay put. This may push the main actor off (0,0); phase 2 fixes it.
  for (const actor of Object.values(container.actors)) {
    if (usesAppearance(actor)) {
      actor.position = pointByAdding(actor.position, deltaFor(actor));
    }
  }

  // Phase 1 (cont.): keep the "after" state still by adjusting action offsets
  // (delta-based moves are anchor-independent and need no change).
  if ("actions" in container) {
    for (const action of container.actions) {
      if (action.type === "move" && action.offset) {
        const target = container.actors[action.actorId];
        action.offset = shiftActionOffset(action.offset, target ? deltaFor(target) : ZERO_DELTA, mainDelta);
      } else if (action.type === "create") {
        action.offset = shiftActionOffset(action.offset, deltaFor(action.actor), mainDelta);
      }
    }
  }

  // Phase 2: the engine requires the main actor to sit at rule-position (0,0)
  // (matching is done relative to it). If it moved, translate the whole frame
  // back — this is a pure relabel, so action offsets (relative to main) are
  // unaffected.
  if (mainDelta.x !== 0 || mainDelta.y !== 0) {
    const shift = { x: -mainDelta.x, y: -mainDelta.y };
    for (const actor of Object.values(container.actors)) {
      actor.position = pointByAdding(actor.position, shift);
    }
    container.extent = extentByShiftingExtent(container.extent, shift);
  }
}

function scrubCharacterFromCharacters(state: Characters, characterId: string): Characters {
  const next = forEachRuleItem(state, (item) => {
    const container = ruleContainer(item);
    if (!container) return;

    const removedIds = Object.values(container.actors)
      .filter((a) => a.characterId === characterId)
      .map((a) => a.id);

    for (const id of removedIds) {
      delete container.actors[id];
    }
    container.conditions = container.conditions.filter(
      (r) =>
        !(
          ("actorId" in r.left && removedIds.includes(r.left.actorId)) ||
          ("actorId" in r.right && removedIds.includes(r.right.actorId))
        ),
    );
    if ("actions" in container) {
      (container as Rule).actions = (container as Rule).actions.filter(
        (r) =>
          !("actorId" in r && removedIds.includes(r.actorId)) &&
          !("actor" in r && r.actor.characterId === characterId),
      );
    }
  });
  delete next[characterId];
  return next;
}

function scrubGlobalFromCharacters(state: Characters, globalId: string): Characters {
  const referencesGlobal = (val: RuleValue | undefined) =>
    !!val && "globalId" in val && val.globalId === globalId;

  return forEachRuleItem(state, (item) => {
    const container = ruleContainer(item);
    if (!container) return;

    container.conditions = container.conditions.filter(
      (r) => !referencesGlobal(r.left) && !referencesGlobal(r.right),
    );
    if ("actions" in container) {
      (container as Rule).actions = (container as Rule).actions.filter(
        (a) =>
          !(a.type === "global" && a.global === globalId) &&
          !("value" in a && referencesGlobal(a.value)),
      );
    }
  });
}

function scrubStageVariableFromCharacters(
  state: Characters,
  stageVariableId: string,
): Characters {
  const referencesStageVar = (val: RuleValue | undefined) =>
    !!val && "stageVariableId" in val && val.stageVariableId === stageVariableId;

  return forEachRuleItem(state, (item) => {
    const container = ruleContainer(item);
    if (!container) return;

    container.conditions = container.conditions.filter(
      (r) => !referencesStageVar(r.left) && !referencesStageVar(r.right),
    );
    if ("actions" in container) {
      (container as Rule).actions = (container as Rule).actions.filter(
        (a) =>
          !(a.type === "stageVariable" && a.stageVariable === stageVariableId) &&
          !("value" in a && referencesStageVar(a.value)),
      );
    }
  });
}

function scrubCharacterVariableFromCharacters(
  state: Characters,
  characterId: string,
  variableId: string,
): Characters {
  return forEachRuleItem(state, (item, ownerCharacterId) => {
    const container = ruleContainer(item);
    if (container) {
      // Within this rule, find the rule-actor-ids that refer to the character
      // whose variable is being deleted. Variable references are
      // (actorId, variableId), so we need both to scope correctly.
      const matchingActorIds = new Set(
        Object.values(container.actors)
          .filter((a) => a.characterId === characterId)
          .map((a) => a.id),
      );
      const referencesVar = (val: RuleValue | undefined) =>
        !!val &&
        "actorId" in val &&
        matchingActorIds.has(val.actorId) &&
        val.variableId === variableId;

      container.conditions = container.conditions.filter(
        (r) => !referencesVar(r.left) && !referencesVar(r.right),
      );
      if ("actions" in container) {
        (container as Rule).actions = (container as Rule).actions.filter(
          (a) =>
            !(
              a.type === "variable" &&
              matchingActorIds.has(a.actorId) &&
              a.variable === variableId
            ) && !("value" in a && referencesVar(a.value)),
        );
      }
    }
    // Loop counts resolve against the character that owns the rule tree,
    // so only reset them when we're inside that character's rules.
    if (
      ownerCharacterId === characterId &&
      item.type === "group-flow" &&
      "behavior" in item &&
      item.behavior === "loop" &&
      "variableId" in item.loopCount &&
      item.loopCount.variableId === variableId
    ) {
      item.loopCount = { constant: 2 };
    }
  });
}
