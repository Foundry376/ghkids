import u from "updeep";

import { EditorState } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import { TOOLS, WORLDS } from "../constants/constants";
import { getCurrentStageForWorld } from "../utils/selectors";
import { buildActorSelection } from "../utils/stage-helpers";
import initialState from "./initial-state";

export default function uiReducer(
  state = initialState.ui,
  action: Actions,
  entireState: EditorState,
) {
  switch (action.type) {
    case Types.SETUP_RECORDING_FOR_ACTOR: {
      const { actor, characterId } = action;
      const stage = getCurrentStageForWorld(entireState.world);
      if (!stage) {
        return state;
      }
      return Object.assign({}, state, {
        selectedCharacterId: characterId,
        selectedActors: buildActorSelection(WORLDS.AFTER, stage.id!, [actor.id!]),
      });
    }
    case Types.CANCEL_RECORDING: {
      return Object.assign({}, state, {
        selectedToolId: TOOLS.POINTER,
        selectedActors: null,
      });
    }
    case Types.FINISH_RECORDING: {
      return Object.assign({}, state, {
        selectedToolId: TOOLS.POINTER,
        selectedActors: null,
      });
    }
    case Types.SELECT_TOOL_ID:
      return Object.assign({}, state, {
        selectedToolId: action.toolId,
        stampToolItem: null,
      });
    case Types.SELECT_TOOL_ITEM:
      return Object.assign({}, state, {
        stampToolItem: action.toolItem,
      });
    case Types.SELECT_DEFINITION_ID:
      return Object.assign({}, state, {
        selectedCharacterId: action.characterId,
        selectedActors: action.actors,
      });
    case Types.DELETE_ACTORS: {
      if (
        state.selectedActors &&
        state.selectedActors.worldId === action.worldId &&
        state.selectedActors.stageId === action.stageId
      ) {
        return Object.assign({}, state, { selectedActors: null });
      }
      return state;
    }
    case Types.DELETE_CHARACTER: {
      if (state.selectedCharacterId === action.characterId) {
        return Object.assign({}, state, {
          selectedCharacterId: null,
          selectedActors: null,
        });
      }
      return state;
    }
    case Types.UPDATE_PLAYBACK_STATE:
      return u({ playback: action.values }, state);
    case Types.UPDATE_PAINTING_STATE:
      return Object.assign({}, state, {
        paint: {
          characterId: action.characterId,
          appearanceId: action.appearanceId,
        },
      });
    case Types.UPDATE_KEYPICKER_STATE:
      return Object.assign({}, state, {
        keypicker: action,
      });
    case Types.UPDATE_MODAL_STATE:
      return Object.assign({}, state, {
        modal: {
          openId: action.openId,
        },
      });
    case Types.UPDATE_TUTORIAL_STATE:
      return u({ tutorial: action.values }, state);
    default:
      return state;
  }
}
