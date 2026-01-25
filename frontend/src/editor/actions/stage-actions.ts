import { DeepPartial, Dispatch } from "redux";
import { Actor, ActorSelection, Character, Stage } from "../../types";
import * as types from "../constants/action-types";

import { Actions } from ".";
import { defaultAppearanceId } from "../utils/character-helpers";
import { makeId } from "../utils/utils";
import { selectStageId } from "./ui-actions";

// stage collection actions

export function createStage(worldId: string, stageName: string) {
  const stageId = makeId("stage");
  return (dispatch: Dispatch<Actions>) => {
    dispatch({
      type: types.CREATE_STAGE,
      worldId,
      stageId,
      stageName,
    } satisfies ActionCreateStage);
    dispatch(selectStageId(worldId, stageId));
  };
}

export type ActionCreateStage = {
  type: "CREATE_STAGE";
  worldId: string;
  stageId: string;
  stageName: string;
};

export function deleteStageId(worldId: string, stageId: string): ActionDeleteStageId {
  return {
    type: types.DELETE_STAGE_ID,
    worldId,
    stageId,
  };
}

export type ActionDeleteStageId = {
  type: "DELETE_STAGE_ID";
  worldId: string;
  stageId: string;
};

// individual stage actions (Require world id, act on current stage in that world)

export function advanceGameState(
  worldId: string,
  options: { clearInput?: boolean } = {},
): ActionAdvanceGameState {
  return {
    type: types.ADVANCE_GAME_STATE,
    worldId,
    clearInput: options.clearInput ?? false,
  };
}

export type ActionAdvanceGameState = {
  type: "ADVANCE_GAME_STATE";
  worldId: string;
  clearInput: boolean;
};

export function stepBackGameState(worldId: string): ActionStepBackGameState {
  return {
    type: types.STEP_BACK_GAME_STATE,
    worldId,
  };
}

export type ActionStepBackGameState = {
  type: "STEP_BACK_GAME_STATE";
  worldId: string;
};

export function saveInitialGameState(
  worldId: string,
  stageId: string,
  { thumbnail, actors }: { thumbnail: string; actors: Stage["actors"] },
): ActionSaveInitialGameState {
  return {
    type: types.SAVE_INITIAL_GAME_STATE,
    worldId,
    stageId,
    thumbnail,
    actors,
  };
}

export type ActionSaveInitialGameState = {
  type: "SAVE_INITIAL_GAME_STATE";
  worldId: string;
  stageId: string;
  thumbnail: string;
  actors: Stage["actors"];
};

export function restoreInitialGameState(
  worldId: string,
  stageId: string,
): ActionRestoreInitialGameState {
  return {
    type: types.RESTORE_INITIAL_GAME_STATE,
    worldId,
    stageId,
  };
}

export type ActionRestoreInitialGameState = {
  type: "RESTORE_INITIAL_GAME_STATE";
  worldId: string;
  stageId: string;
};

export function updateStageSettings(
  worldId: string,
  stageId: string,
  settings: DeepPartial<Stage>,
): ActionUpdateStageSettings {
  return {
    type: types.UPDATE_STAGE_SETTINGS,
    worldId,
    stageId,
    settings,
  };
}

export type ActionUpdateStageSettings = {
  type: "UPDATE_STAGE_SETTINGS";
  worldId: string;
  stageId: string;
  settings: DeepPartial<Stage>;
};

export function recordInputForGameState(
  worldId: string,
  input: {
    keys?: { [key: string]: true };
    clicks?: { [actorId: string]: true };
  },
): ActionInputForGameState {
  return {
    type: types.INPUT_FOR_GAME_STATE,
    worldId,
    ...input,
  };
}

export type ActionInputForGameState = {
  type: "INPUT_FOR_GAME_STATE";
  worldId: string;
  keys?: { [key: string]: true };
  clicks?: { [actorId: string]: true };
};

export function createActors(
  worldId: string,
  stageId: string,
  created: { character: Character; initialValues: DeepPartial<Actor> }[],
) {
  return {
    type: types.UPSERT_ACTORS,
    worldId,
    stageId,
    upserts: created.map(({ character, initialValues }) => {
      const newID = makeId("actor");

      const newActor: DeepPartial<Actor> = Object.assign(
        {
          variableValues: {},
          appearance: defaultAppearanceId(character.spritesheet),
        },
        initialValues,
        {
          characterId: character.id,
          id: newID,
        },
      );

      return {
        id: newID,
        values: newActor,
      };
    }),
  };
}

export function changeActors(
  selection: ActorSelection,
  values: DeepPartial<Actor>,
): ActionUpsertActor {
  return {
    type: types.UPSERT_ACTORS,
    ...selection,
    upserts: selection.actorIds.map((id) => ({ id, values })),
  };
}

export function changeActorsIndividually(
  worldId: string,
  stageId: string,
  upserts: ActionUpsertActor["upserts"],
): ActionUpsertActor {
  return {
    type: types.UPSERT_ACTORS,
    worldId,
    stageId,
    upserts,
  };
}

export type ActionUpsertActor = {
  type: "UPSERT_ACTORS";
  worldId: string;
  stageId: string;
  upserts: { id: string; values: DeepPartial<Actor> }[];
};

export function deleteActors(selection: ActorSelection): ActionDeleteActor {
  return {
    type: types.DELETE_ACTORS,
    ...selection,
  };
}

export type ActionDeleteActor = {
  type: "DELETE_ACTORS";
  worldId: string;
  stageId: string;
  actorIds: string[];
};

export type StageActions =
  | ActionCreateStage
  | ActionDeleteStageId
  | ActionDeleteActor
  | ActionUpsertActor
  | ActionAdvanceGameState
  | ActionStepBackGameState
  | ActionSaveInitialGameState
  | ActionRestoreInitialGameState
  | ActionUpdateStageSettings
  | ActionInputForGameState;
