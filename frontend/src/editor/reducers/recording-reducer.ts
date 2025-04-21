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
  World,
  WorldMinimal,
} from "../../types";
import { Actions } from "../actions";
import { DEFAULT_APPEARANCE_INFO } from "../components/sprites/sprite";
import {
  getAfterWorldForRecording,
  offsetForEditingRule,
} from "../components/stage/recording/utils";
import { RECORDING_PHASE, WORLDS } from "../constants/constants";
import { extentByShiftingExtent } from "../utils/recording-helpers";
import { getCurrentStageForWorld } from "../utils/selectors";
import WorldOperator from "../utils/world-operator";

function stateForEditingRule(phase: RECORDING_PHASE, rule: Rule, entireState: EditorState) {
  const { world, characters } = entireState;
  const offset = offsetForEditingRule(rule.extent, world);
  return {
    ruleId: rule.id,
    characterId: rule.actors[rule.mainActorId].characterId,
    phase: phase,
    actorId: rule.mainActorId,
    conditions: u.constant(rule.conditions),
    actions: u.constant(rule.actions),
    extent: u.constant(extentByShiftingExtent(rule.extent, offset)),
    beforeWorld: u.constant(
      WorldOperator(u({ id: WORLDS.BEFORE }, world) as World, characters).resetForRule(rule, {
        offset,
        applyActions: false,
      }),
    ),
  };
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

  if ("worldId" in action && action.worldId && action.worldId === state.afterWorld.id) {
    const recordingAction = buildActionFromStageActions(state, action);
    if (recordingAction) {
      nextState.actions = [...nextState.actions, recordingAction];
    }
  }

  switch (action.type) {
    case Types.SETUP_RECORDING_FOR_ACTOR: {
      const { actor } = action;
      const { anchor, width, height } =
        characters[actor.characterId].spritesheet.appearanceInfo?.[actor.appearance] ||
        DEFAULT_APPEARANCE_INFO;

      return u(
        {
          ruleId: null,
          characterId: actor.characterId,
          phase: RECORDING_PHASE.SETUP,
          actorId: actor.id,
          actions: u.constant([]),
          conditions: u.constant({ [actor.id]: {} }),
          beforeWorld: u.constant(u({ id: WORLDS.BEFORE }, world)),
          extent: u.constant({
            xmin: actor.position.x - anchor.x,
            xmax: actor.position.x - anchor.x + width - 1,
            ymin: actor.position.y - anchor.y,
            ymax: actor.position.y - anchor.y + height - 1,
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
        conditions: { dude: {} },
        extent: { xmin: 0, ymin: 0, xmax: 0, ymax: 0, ignored: {} },
        actors: {
          dude: {
            id: "dude",
            variableValues: {},
            appearance: Object.keys(character.spritesheet.appearances)[0],
            characterId: action.characterId,
            position: { x: 0, y: 0 },
          },
        },
      };
      return u(stateForEditingRule(RECORDING_PHASE.SETUP, initialRule, entireState), nextState);
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
    case Types.START_RECORDING: {
      return u(
        {
          phase: RECORDING_PHASE.RECORD,
        },
        nextState,
      );
    }
    case Types.UPDATE_RECORDING_CONDITION: {
      const { actorId, key, values } = action;
      if ("enabled" in values && values.enabled === false) {
        return u({ conditions: { [actorId]: u.omit(key) } }, nextState);
      }
      return u({ conditions: { [actorId]: { [key]: u.constant(values) } } }, nextState);
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

function buildActionFromStageActions(
  { actorId, beforeWorld, afterWorld }: RecordingState,
  action: Actions,
): RuleAction | null {
  const mainActorBeforePosition = getCurrentStageForWorld(beforeWorld)!.actors[actorId!].position;

  switch (action.type) {
    case Types.UPSERT_ACTOR: {
      const existing = getCurrentStageForWorld(afterWorld)?.actors[action.actorId];
      if (!existing) {
        return {
          type: "create",
          actor: action.values as Actor,
          actorId: action.actorId,
          offset: {
            x: action.values.position!.x! - mainActorBeforePosition.x,
            y: action.values.position!.y! - mainActorBeforePosition.y,
          },
        };
      }
      if ("position" in action.values) {
        const pos = action.values.position!;
        if (pos.x === existing.position.x && pos.y === existing.position.y) {
          return null;
        }
        return {
          type: "move",
          actorId: action.actorId,
          offset: { x: pos.x! - mainActorBeforePosition.x, y: pos.y! - mainActorBeforePosition.y },
        };
      }
      if ("variableValues" in action.values) {
        const [key, value] = Object.entries(action.values.variableValues || {})[0];
        if (existing.variableValues[key] === value) {
          return null;
        }
        return {
          type: "variable",
          actorId: action.actorId,
          operation: "set",
          variable: key,
          value: value!,
        };
      }

      if ("transform" in action.values) {
        if (existing.transform === action.values.transform) {
          return null;
        }
        return {
          type: "transform",
          actorId: action.actorId,
          to: action.values.transform!,
        };
      }
      if ("appearance" in action.values) {
        if (existing.appearance === action.values.appearance) {
          return null;
        }
        return {
          type: "appearance",
          actorId: action.actorId,
          to: action.values.appearance!,
        };
      }
      return null;
    }
    case Types.DELETE_ACTOR: {
      return {
        type: "delete",
        actorId: action.actorId,
      };
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

  if (nextState.actions !== state.actions || nextState.beforeWorld !== state.beforeWorld) {
    nextState.afterWorld = getAfterWorldForRecording(
      nextState.beforeWorld,
      entireState.characters,
      nextState,
    ) as WorldMinimal & { id: WORLDS.AFTER };
  }

  return nextState;
}
