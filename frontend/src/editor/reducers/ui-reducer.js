import u from "updeep";

import * as Types from "../constants/action-types";
import { WORLDS } from "../constants/constants";
import { buildActorPath, nullActorPath } from "../utils/stage-helpers";
import initialState from "./initial-state";

export default function uiReducer(
  state = initialState.ui,
  action,
  entireState
) {
  switch (action.type) {
    case Types.START_RECORDING: {
      const { actorId, characterId } = entireState.recording;
      const current = entireState.ui.selectedActorPath;

      return Object.assign({}, state, {
        selectedCharacterId: characterId,
        selectedActorPath: buildActorPath(
          WORLDS.AFTER,
          current.stageId,
          actorId
        ),
      });
    }
    case Types.CANCEL_RECORDING: {
      return Object.assign({}, state, {
        selectedActorPath: nullActorPath(),
      });
    }
    case Types.FINISH_RECORDING: {
      return Object.assign({}, state, {
        selectedActorPath: nullActorPath(),
      });
    }
    case Types.SELECT_TOOL_ID:
      return Object.assign({}, state, {
        selectedToolId: action.toolId,
      });
    case Types.SELECT_DEFINITION_ID:
      return Object.assign({}, state, {
        selectedCharacterId: action.characterId,
        selectedActorPath: action.actorPath,
      });
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
        keypicker: {
          initialKeyCode: action.initialKeyCode,
          characterId: action.characterId,
          ruleId: action.ruleId,
        },
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
