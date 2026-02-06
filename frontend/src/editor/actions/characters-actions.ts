import { DeepPartial } from "redux";
import { Character, RuleTreeEventItem } from "../../types";
import * as types from "../constants/action-types";
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
