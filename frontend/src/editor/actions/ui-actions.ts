import { DeepPartial, Dispatch } from "redux";
import { Actions } from ".";
import { ActorSelection, EditorState } from "../../types";
import * as types from "../constants/action-types";

export function selectToolId(toolId: string) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.SELECT_TOOL_ID,
      toolId,
    });
  };
}
export function selectToolItem(toolItem: EditorState["ui"]["stampToolItem"]): ActionSelectToolItem {
  return {
    type: types.SELECT_TOOL_ITEM,
    toolItem,
  };
}

export function selectStageId(worldId: string, stageId: string): ActionSelectStageId {
  return {
    type: types.SELECT_STAGE_ID,
    worldId,
    stageId,
  };
}

export function select(
  characterId: string | null,
  actors: ActorSelection | null,
): ActionSelectDefinitionId {
  return {
    type: types.SELECT_DEFINITION_ID,
    characterId,
    actors,
  };
}

export function updatePlaybackState(
  values: EditorState["ui"]["playback"],
): ActionUpdatePlaybackState {
  return {
    type: types.UPDATE_PLAYBACK_STATE,
    values,
  };
}

export function stopPlayback(): ActionUpdatePlaybackState {
  return {
    type: types.UPDATE_PLAYBACK_STATE,
    values: { running: false },
  };
}

export function showModal(id: string) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.UPDATE_MODAL_STATE,
      openId: id,
    });
  };
}

export function dismissModal(): ActionDismissModal {
  return {
    type: types.UPDATE_MODAL_STATE,
    openId: null,
  };
}

export function paintCharacterAppearance(characterId: string, appearanceId: string) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.UPDATE_PAINTING_STATE,
      characterId,
      appearanceId,
    });
  };
}

export function pickConditionValueFromKeyboard(
  open: boolean,
  initialKey: string | null,
  replaceConditionKey: string | null,
) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.UPDATE_KEYPICKER_STATE,
      open,
      initialKey,
      replaceConditionKey,
    });
  };
}

export function updateTutorialState(
  values: EditorState["ui"]["tutorial"],
): ActionUpdateTutorialState {
  return {
    type: types.UPDATE_TUTORIAL_STATE,
    values,
  };
}

export type ActionSelectToolId = {
  type: "SELECT_TOOL_ID";
  toolId: string;
};

export type ActionSelectToolItem = {
  type: "SELECT_TOOL_ITEM";
  toolItem: EditorState["ui"]["stampToolItem"];
};

export type ActionSelectStageId = {
  type: "SELECT_STAGE_ID";
  worldId: string;
  stageId: string;
};

export type ActionSelectDefinitionId = {
  type: "SELECT_DEFINITION_ID";
  characterId: string | null;
  actors: ActorSelection | null;
};

export type ActionUpdatePlaybackState = {
  type: "UPDATE_PLAYBACK_STATE";
  values: DeepPartial<EditorState["ui"]["playback"]>;
};

export type ActionShowModal = {
  type: "UPDATE_MODAL_STATE";
  openId: string;
};

export type ActionDismissModal = {
  type: "UPDATE_MODAL_STATE";
  openId: null;
};

export type ActionUpdatePaintingState = {
  type: "UPDATE_PAINTING_STATE";
  characterId: string;
  appearanceId: string;
};

export type ActionUpdateKeypickerState = {
  type: "UPDATE_KEYPICKER_STATE";
  open: boolean;
  initialKey: string | null;
  replaceConditionKey: string | null;
};

export type ActionUpdateTutorialState = {
  type: "UPDATE_TUTORIAL_STATE";
  values: EditorState["ui"]["tutorial"];
};

export type UIActions =
  | ActionSelectToolId
  | ActionSelectToolItem
  | ActionSelectStageId
  | ActionSelectDefinitionId
  | ActionUpdatePlaybackState
  | ActionShowModal
  | ActionDismissModal
  | ActionUpdatePaintingState
  | ActionUpdateKeypickerState
  | ActionUpdateTutorialState;
