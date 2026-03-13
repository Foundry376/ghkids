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
      let selectedCharacterId = state.selectedCharacterId;
      let selectedActors = state.selectedActors;

      if (selectedCharacterId === action.characterId) {
        selectedCharacterId = null;
        selectedActors = null;
      }

      // Also filter any selected actors that belong to the deleted character,
      // even if a different character is the "selected" one in the inspector.
      if (selectedActors) {
        const stage = entireState.world.stages[selectedActors.stageId];
        if (stage) {
          const filteredIds = selectedActors.actorIds.filter(
            (id) => stage.actors[id]?.characterId !== action.characterId,
          );
          if (filteredIds.length !== selectedActors.actorIds.length) {
            selectedActors = filteredIds.length > 0 ? { ...selectedActors, actorIds: filteredIds } : null;
          }
        }
      }

      if (selectedCharacterId !== state.selectedCharacterId || selectedActors !== state.selectedActors) {
        return Object.assign({}, state, { selectedCharacterId, selectedActors });
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
