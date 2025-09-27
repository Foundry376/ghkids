/* eslint no-param-reassign: 0 */
import u from "updeep";

import stageCollectionReducer from "./stage-collection-reducer";

import { EditorState, WorldMinimal } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
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
    case Types.INPUT_FOR_GAME_STATE: {
      return u(
        {
          input: {
            keys: action.keys,
            clicks: action.clicks,
          },
        },
        state,
      );
    }
    case Types.ADVANCE_GAME_STATE: {
      const { characters } = entireState;
      return WorldOperator(state, characters).tick();
    }
    case Types.STEP_BACK_GAME_STATE: {
      const { characters } = entireState;
      return WorldOperator(state, characters).untick();
    }
    case Types.UPSERT_ACTORS:
    case Types.DELETE_ACTORS:
    case Types.DELETE_CHARACTER:
    case Types.RESTORE_INITIAL_GAME_STATE:
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
