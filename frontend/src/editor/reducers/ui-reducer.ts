import u from "updeep";

import { EditorState } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import { TOOLS, WORLDS } from "../constants/constants";
import { getCurrentStageForWorld } from "../utils/selectors";
import { buildActorPath, nullActorPath } from "../utils/stage-helpers";
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
        selectedActorPath: buildActorPath(WORLDS.AFTER, stage.id!, actor.id!),
      });
    }
    case Types.CANCEL_RECORDING: {
      return Object.assign({}, state, {
        selectedToolId: TOOLS.POINTER,
        selectedActorPath: nullActorPath(),
      });
    }
    case Types.FINISH_RECORDING: {
      return Object.assign({}, state, {
        selectedToolId: TOOLS.POINTER,
        selectedActorPath: nullActorPath(),
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
        selectedActorPath: action.actorPath,
      });
    case Types.DELETE_ACTOR: {
      if (state.selectedActorPath.actorId === action.actorId) {
        return Object.assign({}, state, {
          selectedActorPath: nullActorPath(),
        });
      }
      return state;
    }
    case Types.DELETE_CHARACTER: {
      if (state.selectedCharacterId === action.characterId) {
        return Object.assign({}, state, {
          selectedCharacterId: null,
          selectedActorPath: nullActorPath(),
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
