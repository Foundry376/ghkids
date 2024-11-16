import * as types from "../constants/action-types";

export function changeCharacter(characterId, values) {
  return {
    type: types.UPSERT_CHARACTER,
    characterId,
    values,
  };
}

export function createCharacter(newId) {
  return {
    type: types.UPSERT_CHARACTER,
    characterId: newId,
    values: {
      id: newId,
      name: "Untitled",
      rules: [],
      spritesheet: {
        width: 40,
        appearances: {
          idle: [new URL("../img/splat.png", import.meta.url).href],
        },
        appearanceNames: {
          idle: "Idle",
        },
      },
      variables: {},
      world: "x",
    },
  };
}

export function deleteCharacter(characterId) {
  return {
    type: types.DELETE_CHARACTER,
    characterId,
  };
}

export function createCharacterFlowContainer(characterId, { id }) {
  return {
    type: types.CREATE_CHARACTER_FLOW_CONTAINER,
    characterId,
    id,
  };
}
export function createCharacterEventContainer(
  characterId,
  { id, eventCode, eventType }
) {
  return {
    type: types.CREATE_CHARACTER_EVENT_CONTAINER,
    characterId,
    eventCode,
    eventType,
    id,
  };
}

export function createCharacterVariable(characterId) {
  const variableId = `${Date.now()}`;
  return {
    type: types.CREATE_CHARACTER_VARIABLE,
    characterId,
    variableId,
  };
}

export function deleteCharacterVariable(characterId, variableId) {
  return {
    type: types.DELETE_CHARACTER_VARIABLE,
    characterId,
    variableId,
  };
}

export function createCharacterAppearance(
  characterId,
  newAppearanceId,
  newAppearanceData
) {
  return {
    type: types.UPSERT_CHARACTER,
    characterId: characterId,
    values: {
      spritesheet: {
        appearances: {
          [newAppearanceId]: [
            newAppearanceData ||
              new URL("../img/splat.png", import.meta.url).href,
          ],
        },
        appearanceNames: { [newAppearanceId]: "Untitled" },
      },
    },
  };
}

export function deleteCharacterAppearance(characterId, appearanceId) {
  return {
    type: types.DELETE_CHARACTER_APPEARANCE,
    characterId,
    appearanceId,
  };
}

export function changeCharacterAppearanceName(characterId, appearanceId, name) {
  const values = { spritesheet: { appearanceNames: {} } };
  values.spritesheet.appearanceNames[appearanceId] = name;
  return changeCharacter(characterId, values);
}
