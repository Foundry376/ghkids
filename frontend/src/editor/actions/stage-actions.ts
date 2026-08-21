import { DeepPartial, Dispatch } from "redux";
import { Actor, ActorSelection, Character, EditorState, Stage } from "../../types";
import * as types from "../constants/action-types";

import { Actions } from ".";
import { defaultAppearanceId } from "../utils/character-helpers";
import { heldKeysAsInput } from "../utils/held-keys";
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

// individual stage actions (Require world id, act on Current Level in that world)

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

/**
 * Advances the world one frame for the playback loop.
 *
 * Each tick clears the input it consumed, so that a key tapped between two
 * ticks fires exactly once. A key that is still physically down has to be put
 * back into the input before the next tick, or holding it would also fire just
 * once instead of producing continuous motion. Held keys are merged into (not
 * substituted for) the frame's input so a key that was tapped and released
 * since the last tick still gets its one frame.
 */
export function advancePlaybackGameState(worldId: string) {
  return (dispatch: Dispatch<Actions>, getState: () => EditorState) => {
    const { world } = getState();
    if (world && world.id === worldId) {
      const held = heldKeysAsInput();
      // Most ticks of a game have no keys down at all. The tick clears the
      // input either way, so there's nothing to write in that case.
      if (Object.keys(held).length > 0) {
        dispatch(recordInputForGameState(worldId, { keys: { ...world.input.keys, ...held } }));
      }
    }
    dispatch(advanceGameState(worldId, { clearInput: true }));
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

export function rewindAllGameState(worldId: string): ActionRewindAllGameState {
  return {
    type: types.REWIND_ALL_GAME_STATE,
    worldId,
  };
}

export type ActionRewindAllGameState = {
  type: "REWIND_ALL_GAME_STATE";
  worldId: string;
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
  | ActionRewindAllGameState
  | ActionUpdateStageSettings
  | ActionInputForGameState;
