import u from "updeep";
import * as Types from "../constants/action-types";
import initialState from "./initial-state";
import worldReducer from "./world-reducer";

import {
  Actor,
  EditorState,
  RecordingState,
  Rule,
  RuleAction,
  RuleCondition,
  RuleTreeFlowItemCheck,
  World,
  WorldMinimal,
} from "../../types";
import { Actions } from "../actions";
import {
  getAfterWorldForRecording,
  offsetForEditingRule,
} from "../components/stage/recording/utils";
import { RECORDING_PHASE, WORLDS } from "../constants/constants";
import { defaultAppearanceId } from "../utils/character-helpers";
import { extentByShiftingExtent } from "../utils/recording-helpers";
import { getCurrentStageForWorld } from "../utils/selectors";
import { actorFilledPoints } from "../utils/stage-helpers";
import WorldOperator from "../utils/world-operator";

function stateForEditingRule(
  phase: RECORDING_PHASE,
  rule: Rule | RuleTreeFlowItemCheck,
  entireState: EditorState,
) {
  const { world, characters } = entireState;

  const offset = offsetForEditingRule(rule.extent, world);
  return {
    ruleId: rule.id,
    characterId: rule.actors[rule.mainActorId].characterId,
    phase: phase,
    actorId: rule.mainActorId,
    conditions: u.constant(rule.conditions),
    actions: "actions" in rule ? u.constant(rule.actions) : u.constant(null),
    extent: u.constant(extentByShiftingExtent(rule.extent, offset)),
    beforeWorld: u.constant(
      WorldOperator(u({ id: WORLDS.BEFORE }, world) as World, characters).resetForRule(rule, {
        offset,
        applyActions: false,
      }),
    ),
  };
}

function isActionForSameVarOrGlobal(r: RuleAction, n: RuleAction) {
  if (n.type === "global" && r.type === "global" && r.global === n.global) {
    return true;
  }
  if (
    n.type === "variable" &&
    r.type === "variable" &&
    r.variable === n.variable &&
    r.actorId === n.actorId
  ) {
    return true;
  }
  return false;
}

function recordingReducer(
  state = initialState.recording,
  action: Actions,
  entireState: EditorState,
) {
  const { world, characters } = entireState;

  const nextState = Object.assign({}, state, {
    beforeWorld: worldReducer(state.beforeWorld, action, entireState),
  });

  if (
    nextState.actions &&
    state.afterWorld &&
    "worldId" in action &&
    action.worldId &&
    action.worldId === state.afterWorld.id
  ) {
    // Look at what was modified in the after stage and create a rule action for it.
    // Normally, rule actions are appended to the list of actions in the rule, but
    // if you modify a var or global you've already modified in the rule, the new
    // action replaces it. There isn't any value in intra-rule changes.
    const recordingActions = buildActionsFromStageActions(state, action);
    if (recordingActions) {
      nextState.actions = [
        ...nextState.actions.filter(
          (r) => !recordingActions.some((n) => isActionForSameVarOrGlobal(n, r)),
        ),
        ...recordingActions,
      ];
    }
  }

  switch (action.type) {
    case Types.SETUP_RECORDING_FOR_ACTOR: {
      const { actor } = action;
      const filled = actorFilledPoints(actor, characters);

      return u(
        {
          ruleId: null,
          characterId: actor.characterId,
          phase: RECORDING_PHASE.RECORD,
          actorId: actor.id,
          actions: u.constant([]),
          conditions: u.constant([
            {
              left: { actorId: actor.id, variableId: "appearance" },
              right: { constant: actor.appearance },
              enabled: true,
              comparator: "=",
              key: "main-actor-appearance",
            },
          ] satisfies RuleCondition[]),
          beforeWorld: u.constant(u({ id: WORLDS.BEFORE }, world)),
          afterWorld: u.constant(u({ id: WORLDS.AFTER }, world)),
          extent: u.constant({
            xmin: Math.min(...filled.map((f) => f.x)),
            xmax: Math.max(...filled.map((f) => f.x)),
            ymin: Math.min(...filled.map((f) => f.y)),
            ymax: Math.max(...filled.map((f) => f.y)),
            ignored: {},
          }),
        },
        nextState,
      );
    }
    case Types.SETUP_RECORDING_FOR_CHARACTER: {
      const character = characters[action.characterId];

      const initialRule: Rule = {
        mainActorId: "dude",
        actions: [],
        type: "rule",
        id: "",
        name: "Untitled Rule",
        conditions: [],
        extent: { xmin: 0, ymin: 0, xmax: 0, ymax: 0, ignored: {} },
        actors: {
          dude: {
            id: "dude",
            variableValues: {},
            appearance: defaultAppearanceId(character.spritesheet),
            characterId: action.characterId,
            position: { x: 0, y: 0 },
          },
        },
      };
      return u(stateForEditingRule(RECORDING_PHASE.RECORD, initialRule, entireState), nextState);
    }
    case Types.EDIT_RULE_RECORDING: {
      return u(stateForEditingRule(RECORDING_PHASE.RECORD, action.rule, entireState), nextState);
    }
    case Types.FINISH_RECORDING: {
      return Object.assign({}, initialState.recording);
    }
    case Types.CANCEL_RECORDING: {
      return Object.assign({}, initialState.recording);
    }
    case Types.UPSERT_RECORDING_CONDITION: {
      const { condition } = action;
      if (condition.enabled === false) {
        return u(
          { conditions: u.reject((i: RuleCondition) => i.key === condition.key) },
          nextState,
        );
      }
      return u(
        {
          conditions: u.constant(
            nextState.conditions.some((c) => c.key === condition.key)
              ? nextState.conditions.map((c) => (c.key === condition.key ? condition : c))
              : [...nextState.conditions, condition],
          ),
        },
        nextState,
      );
    }
    case Types.UPDATE_RECORDING_ACTIONS: {
      const { actions } = action;
      return u({ actions: u.constant(actions) }, nextState);
    }
    case Types.SET_RECORDING_EXTENT: {
      // find the primary actor, make sure the extent still includes it
      const extent = Object.assign({}, action.extent);
      for (const world of [nextState.beforeWorld]) {
        const stage = getCurrentStageForWorld(world);
        const mainActor = Object.values(stage!.actors || {}).find(
          (a) => a.id === nextState.actorId,
        );
        if (mainActor) {
          extent.xmin = Math.min(extent.xmin, mainActor.position.x);
          extent.ymin = Math.min(extent.ymin, mainActor.position.y);
          extent.xmax = Math.max(extent.xmax, mainActor.position.x);
          extent.ymax = Math.max(extent.ymax, mainActor.position.y);
        }
      }

      return u({ extent }, nextState);
    }
    case Types.TOGGLE_RECORDING_SQUARE_IGNORED: {
      const { x, y } = action.position;
      const { xmin, xmax, ymin, ymax } = nextState.extent;

      if (x < xmin || x > xmax || y < ymin || y > ymax) {
        return nextState;
      }
      const key = `${x},${y}`;
      const ignored = nextState.extent.ignored[key] ? u.omit(key) : { [key]: true };
      return u({ extent: { ignored } }, nextState);
    }
    default:
      return nextState;
  }
}

function buildActionsFromStageActions(
  { actorId, beforeWorld, afterWorld }: RecordingState,
  action: Actions,
): RuleAction[] | null {
  const mainActorBeforePosition = getCurrentStageForWorld(beforeWorld)!.actors[actorId!].position;

  switch (action.type) {
    case Types.UPSERT_ACTORS: {
      return action.upserts
        .map(({ id: actorId, values }): RuleAction | null => {
          const existing = afterWorld && getCurrentStageForWorld(afterWorld)?.actors[actorId];
          if (!existing) {
            return {
              type: "create",
              actor: values as Actor,
              actorId: actorId,
              offset: {
                x: values.position!.x! - mainActorBeforePosition.x,
                y: values.position!.y! - mainActorBeforePosition.y,
              },
            };
          }
          if ("position" in values) {
            const pos = values.position!;
            if (pos.x === existing.position.x && pos.y === existing.position.y) {
              return null;
            }
            return {
              type: "move",
              actorId: actorId,
              offset: {
                x: pos.x! - mainActorBeforePosition.x,
                y: pos.y! - mainActorBeforePosition.y,
              },
            };
          }
          if ("variableValues" in values) {
            const [key, value] = Object.entries(values.variableValues || {})[0];
            if (existing.variableValues[key] === value) {
              return null;
            }
            return {
              type: "variable",
              actorId: actorId,
              operation: "set",
              variable: key,
              value: { constant: value! },
            };
          }

          if ("transform" in values && existing.transform !== values.transform) {
            return {
              type: "transform",
              actorId: actorId,
              operation: "set",
              value: { constant: values.transform! },
            };
          }
          if ("appearance" in values && existing.appearance !== values.appearance) {
            return {
              type: "appearance",
              actorId: actorId,
              value: { constant: values.appearance! },
            };
          }
          return null;
        })
        .filter((a): a is RuleAction => !!a);
    }
    case Types.DELETE_ACTORS: {
      return action.actorIds.map((actorId) => ({
        type: "delete",
        actorId,
      }));
    }
    default:
      return null;
  }
}

export default function recordingReducerWithDerivedState(
  state = initialState.recording,
  action: Actions,
  entireState: EditorState,
) {
  const nextState = recordingReducer(state, action, entireState) as RecordingState;

  if (
    !nextState.afterWorld ||
    nextState.beforeWorld !== state.beforeWorld ||
    nextState.actions !== state.actions
  ) {
    nextState.afterWorld = getAfterWorldForRecording(
      nextState.beforeWorld,
      entireState.characters,
      nextState,
    ) as WorldMinimal & { id: WORLDS.AFTER };
  }

  return nextState;
}
