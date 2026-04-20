import { DeepPartial } from "redux";
import { Character, RuleTreeEventItem } from "../../types";
import * as types from "../constants/action-types";
import { DOOR_VARIABLE_IDS } from "../utils/door-constants";
import { makeId } from "../utils/utils";

export function upsertCharacter(
  characterId: string,
  values: DeepPartial<Character>,
): ActionUpsertCharacter {
  return {
    type: types.UPSERT_CHARACTER,
    characterId,
    values,
  };
}

export type ActionUpsertCharacter = {
  type: "UPSERT_CHARACTER";
  characterId: string;
  values: DeepPartial<Character>;
};

export function createCharacter(newId: string): ActionUpsertCharacter {
  return {
    type: types.UPSERT_CHARACTER,
    characterId: newId,
    values: {
      id: newId,
      name: "Untitled",
      rules: [],
      spritesheet: {
        appearances: {
          idle: [new URL("../img/splat.png", import.meta.url).href],
        },
        appearanceNames: {
          idle: "Idle",
        },
      },
      variables: {},
    },
  };
}

export function createDoorCharacter(newId: string): ActionUpsertCharacter {
  return {
    type: types.UPSERT_CHARACTER,
    characterId: newId,
    values: {
      id: newId,
      name: "Door",
      kind: "door",
      rules: [],
      spritesheet: {
        appearances: {
          idle: [
            `data:image/png;base64,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`,
          ],
        },
        appearanceNames: {
          idle: "Idle",
        },
      },
      variables: {
        [DOOR_VARIABLE_IDS.destinationX]: {
          id: DOOR_VARIABLE_IDS.destinationX,
          name: "Destination X",
          defaultValue: "0",
        },
        [DOOR_VARIABLE_IDS.destinationY]: {
          id: DOOR_VARIABLE_IDS.destinationY,
          name: "Destination Y",
          defaultValue: "0",
        },
        [DOOR_VARIABLE_IDS.destinationStage]: {
          id: DOOR_VARIABLE_IDS.destinationStage,
          name: "Destination Level",
          defaultValue: "",
          type: "stage",
        },
      },
    },
  };
}

export function deleteCharacter(characterId: string): ActionDeleteCharacter {
  return {
    type: types.DELETE_CHARACTER,
    characterId,
  };
}

export type ActionDeleteCharacter = {
  type: "DELETE_CHARACTER";
  characterId: string;
};

export function createCharacterFlowContainer(
  characterId: string,
  { id }: { id: string },
): ActionCreateCharacterFlowContainer {
  return {
    type: types.CREATE_CHARACTER_FLOW_CONTAINER,
    characterId,
    id,
  };
}

export type ActionCreateCharacterFlowContainer = {
  type: "CREATE_CHARACTER_FLOW_CONTAINER";
  characterId: string;
  id: string;
};

export function createCharacterEventContainer(
  characterId: string,
  {
    id,
    eventCode,
    eventType,
  }: { id: string; eventType: RuleTreeEventItem["event"]; eventCode: RuleTreeEventItem["code"] },
): ActionCreateCharacterEventContainer {
  return {
    type: types.CREATE_CHARACTER_EVENT_CONTAINER,
    characterId,
    eventCode,
    eventType,
    id,
  };
}

export type ActionCreateCharacterEventContainer = {
  type: "CREATE_CHARACTER_EVENT_CONTAINER";
  characterId: string;
  id: string;
  eventType: RuleTreeEventItem["event"];
  eventCode: RuleTreeEventItem["code"];
};

export function createCharacterVariable(characterId: string): ActionCreateCharacterVariable {
  const variableId = makeId("var");
  return {
    type: types.CREATE_CHARACTER_VARIABLE,
    characterId,
    variableId,
  };
}

export type ActionCreateCharacterVariable = {
  type: "CREATE_CHARACTER_VARIABLE";
  characterId: string;
  variableId: string;
};

export function deleteCharacterVariable(
  characterId: string,
  variableId: string,
): ActionDeleteCharacterVariable {
  return {
    type: types.DELETE_CHARACTER_VARIABLE,
    characterId,
    variableId,
  };
}

export type ActionDeleteCharacterVariable = {
  type: "DELETE_CHARACTER_VARIABLE";
  characterId: string;
  variableId: string;
};

export function createCharacterAppearance(
  characterId: string,
  newAppearanceId: string,
  newAppearanceData: string | null,
): ActionUpsertCharacter {
  return {
    type: types.UPSERT_CHARACTER,
    characterId: characterId,
    values: {
      spritesheet: {
        appearances: {
          [newAppearanceId]: [
            newAppearanceData || new URL("../img/splat.png", import.meta.url).href,
          ],
        },
        appearanceNames: { [newAppearanceId]: "Untitled" },
      },
    },
  };
}

export function deleteCharacterAppearance(
  characterId: string,
  appearanceId: string,
): ActionDeleteCharacterAppearance {
  return {
    type: types.DELETE_CHARACTER_APPEARANCE,
    characterId,
    appearanceId,
  };
}

export type ActionDeleteCharacterAppearance = {
  type: "DELETE_CHARACTER_APPEARANCE";
  characterId: string;
  appearanceId: string;
};

export function changeCharacterAppearanceName(
  characterId: string,
  appearanceId: string,
  name: string,
) {
  return upsertCharacter(characterId, {
    spritesheet: {
      appearanceNames: {
        [appearanceId]: name,
      },
    },
  });
}

export function setCharacterZOrder(characterZOrder: string[]): ActionSetCharacterZOrder {
  return {
    type: types.SET_CHARACTER_Z_ORDER,
    characterZOrder,
  };
}

export type ActionSetCharacterZOrder = {
  type: "SET_CHARACTER_Z_ORDER";
  characterZOrder: string[];
};

export type CharacterActions =
  | ActionUpsertCharacter
  | ActionDeleteCharacter
  | ActionDeleteCharacterAppearance
  | ActionCreateCharacterVariable
  | ActionDeleteCharacterVariable
  | ActionCreateCharacterEventContainer
  | ActionCreateCharacterFlowContainer
  | ActionSetCharacterZOrder;
