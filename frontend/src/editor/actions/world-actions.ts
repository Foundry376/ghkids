import { DeepPartial } from "redux";
import { Global, StageVariable, World } from "../../types";
import * as types from "../constants/action-types";
import { makeId } from "../utils/utils";

export function upsertGlobal(
  worldId: string,
  globalId: string,
  changes: DeepPartial<Global>,
): ActionUpsertGlobal {
  return {
    type: types.UPSERT_GLOBAL,
    worldId,
    globalId,
    changes,
  };
}

export type ActionUpsertGlobal = {
  type: "UPSERT_GLOBAL";
  worldId?: string;
  globalId: string;
  changes: DeepPartial<Global>;
};

export function createGlobal(worldId?: string): ActionUpsertGlobal {
  const globalId = makeId("global");
  return {
    type: types.UPSERT_GLOBAL,
    worldId,
    globalId,
    changes: {
      id: globalId,
      name: "Untitled",
      value: "0",
    },
  };
}

export function deleteGlobal(worldId: string, globalId: string): ActionDeleteGlobal {
  return {
    type: types.DELETE_GLOBAL,
    worldId,
    globalId,
  };
}

export type ActionDeleteGlobal = {
  type: "DELETE_GLOBAL";
  worldId: string;
  globalId: string;
};

export function upsertStageVariable(
  worldId: string | undefined,
  stageVariableId: string,
  changes: Partial<StageVariable>,
): ActionUpsertStageVariable {
  return {
    type: types.UPSERT_STAGE_VARIABLE,
    worldId,
    stageVariableId,
    changes,
  };
}

export type ActionUpsertStageVariable = {
  type: "UPSERT_STAGE_VARIABLE";
  worldId?: string;
  stageVariableId: string;
  changes: Partial<StageVariable>;
};

export function createStageVariable(worldId?: string): ActionUpsertStageVariable {
  const stageVariableId = makeId("stagevar");
  return {
    type: types.UPSERT_STAGE_VARIABLE,
    worldId,
    stageVariableId,
    changes: {
      id: stageVariableId,
      name: "Untitled",
    },
  };
}

export function deleteStageVariable(
  worldId: string,
  stageVariableId: string,
): ActionDeleteStageVariable {
  return {
    type: types.DELETE_STAGE_VARIABLE,
    worldId,
    stageVariableId,
  };
}

export type ActionDeleteStageVariable = {
  type: "DELETE_STAGE_VARIABLE";
  worldId: string;
  stageVariableId: string;
};

export function setStageVariableValue(
  worldId: string,
  stageId: string,
  stageVariableId: string,
  value: string | undefined,
): ActionSetStageVariableValue {
  return {
    type: types.SET_STAGE_VARIABLE_VALUE,
    worldId,
    stageId,
    stageVariableId,
    value,
  };
}

export type ActionSetStageVariableValue = {
  type: "SET_STAGE_VARIABLE_VALUE";
  worldId: string;
  stageId: string;
  stageVariableId: string;
  value: string | undefined;
};

export function setGlobalOrder(
  worldId: string | undefined,
  orderedGlobalIds: string[],
): ActionSetGlobalOrder {
  return {
    type: types.SET_GLOBAL_ORDER,
    worldId,
    orderedGlobalIds,
  };
}

export type ActionSetGlobalOrder = {
  type: "SET_GLOBAL_ORDER";
  worldId?: string;
  orderedGlobalIds: string[];
};

export function setStageVariableOrder(
  worldId: string | undefined,
  orderedStageVariableIds: string[],
): ActionSetStageVariableOrder {
  return {
    type: types.SET_STAGE_VARIABLE_ORDER,
    worldId,
    orderedStageVariableIds,
  };
}

export type ActionSetStageVariableOrder = {
  type: "SET_STAGE_VARIABLE_ORDER";
  worldId?: string;
  orderedStageVariableIds: string[];
};

export function updateWorldMetadata(
  worldId: string,
  metadata: World["metadata"],
): ActionUpdateWorldMetadata {
  return {
    type: types.UPDATE_WORLD_METADATA,
    worldId,
    metadata,
  };
}
export type ActionUpdateWorldMetadata = {
  type: "UPDATE_WORLD_METADATA";
  worldId: string;
  metadata: World["metadata"];
};

export type WorldActions =
  | ActionUpsertGlobal
  | ActionDeleteGlobal
  | ActionUpsertStageVariable
  | ActionDeleteStageVariable
  | ActionSetStageVariableValue
  | ActionSetGlobalOrder
  | ActionSetStageVariableOrder
  | ActionUpdateWorldMetadata;
