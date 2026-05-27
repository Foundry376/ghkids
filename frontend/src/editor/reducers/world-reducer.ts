/* eslint no-param-reassign: 0 */
import u from "updeep";

import stageCollectionReducer from "./stage-collection-reducer";

import { EditorState, World, WorldMinimal } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import {
  initialValueForStageVariable,
  isBuiltinStageVariableId,
} from "../utils/builtin-stage-variables";
import { getCurrentStageForWorld } from "../utils/selectors";
import WorldOperator from "../utils/world-operator";

export default function worldReducer(
  state: WorldMinimal,
  action: Actions,
  entireState: EditorState,
) {
  if ("worldId" in action && action.worldId && action.worldId !== state.id) {
    return state;
  }

  state = Object.assign({}, state, {
    stages: stageCollectionReducer(state.stages, action),
  });

  switch (action.type) {
    case Types.SELECT_STAGE_ID: {
      return u({ globals: { selectedStageId: { value: action.stageId } } }, state);
    }
    case Types.UPDATE_WORLD_METADATA: {
      return u({ metadata: action.metadata }, state);
    }
    case Types.UPSERT_GLOBAL: {
      return u({ globals: { [action.globalId]: action.changes } }, state);
    }
    case Types.DELETE_GLOBAL: {
      return u({ globals: u.omit(action.globalId) }, state);
    }
    case Types.UPSERT_STAGE_VARIABLE: {
      const isCreating = !state.stageVariables[action.stageVariableId];
      const nextState = u(
        { stageVariables: { [action.stageVariableId]: action.changes } },
        state,
      ) as WorldMinimal;
      if (!isCreating) {
        return nextState;
      }
      // Maintain the invariant: every defined stage variable has a value on
      // every stage. Seed the new variable on every stage with its initial.
      const initial = initialValueForStageVariable(action.stageVariableId);
      const stageUpdates: Record<string, { variableValues: { [id: string]: string } }> = {};
      for (const stageId of Object.keys(nextState.stages)) {
        stageUpdates[stageId] = { variableValues: { [action.stageVariableId]: initial } };
      }
      return u({ stages: stageUpdates }, nextState);
    }
    case Types.DELETE_STAGE_VARIABLE: {
      // Built-in stage variables (wrapX, wrapY, ...) are part of the engine
      // contract and cannot be deleted.
      if (isBuiltinStageVariableId(action.stageVariableId)) {
        return state;
      }
      // Drop the definition and any per-stage overrides for the variable
      const stageUpdates: Record<string, { variableValues: unknown }> = {};
      for (const stageId of Object.keys(state.stages)) {
        stageUpdates[stageId] = { variableValues: u.omit(action.stageVariableId) };
      }
      return u(
        { stageVariables: u.omit(action.stageVariableId), stages: stageUpdates },
        state,
      );
    }
    case Types.SET_STAGE_VARIABLE_VALUE: {
      // Invariant: every defined stage variable has a value on every stage.
      // Treat an undefined value as a reset to the variable's initial seed.
      const value =
        action.value === undefined
          ? initialValueForStageVariable(action.stageVariableId)
          : action.value;
      return u(
        { stages: { [action.stageId]: { variableValues: { [action.stageVariableId]: value } } } },
        state,
      );
    }
    case Types.CREATE_STAGE: {
      // stageCollectionReducer just spread initialStateStage onto the new
      // stage. Make the new stage inherit the currently-selected stage's
      // variableValues (so Level 2 starts "like Level 1"), then patch in any
      // missing stage variables with their initial values to uphold the
      // every-var-on-every-stage invariant.
      const newStage = state.stages[action.stageId];
      if (!newStage) return state;
      const sourceStage = getCurrentStageForWorld(state);
      const seeded: Record<string, string> = sourceStage
        ? { ...sourceStage.variableValues }
        : { ...newStage.variableValues };
      for (const id of Object.keys(state.stageVariables)) {
        if (seeded[id] === undefined) {
          seeded[id] = initialValueForStageVariable(id);
        }
      }
      return u(
        { stages: { [action.stageId]: { variableValues: u.constant(seeded) } } },
        state,
      );
    }
    case Types.INPUT_FOR_GAME_STATE: {
      const inputUpdates: { keys?: unknown; clicks?: unknown } = {};
      if (action.keys !== undefined) {
        inputUpdates.keys = u.constant(action.keys);
      }
      if (action.clicks !== undefined) {
        inputUpdates.clicks = action.clicks;
      }
      return u({ input: inputUpdates }, state);
    }
    case Types.ADVANCE_GAME_STATE: {
      const { characters } = entireState;
      return WorldOperator(state, characters).tick({ clearInput: action.clearInput });
    }
    case Types.STEP_BACK_GAME_STATE: {
      const { characters } = entireState;
      return WorldOperator(state, characters).untick();
    }
    case Types.REWIND_ALL_GAME_STATE: {
      const { characters } = entireState;
      let current = state as World;
      while (current.history && current.history.length > 0) {
        current = WorldOperator(current, characters).untick() as World;
      }
      return current;
    }
    case Types.UPSERT_ACTORS:
    case Types.DELETE_ACTORS:
    case Types.DELETE_CHARACTER:
      return u(
        {
          history: u.constant([]),
        },
        state,
      );

    default:
      return state;
  }
}
