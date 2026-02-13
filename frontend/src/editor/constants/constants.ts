export const STAGE_CELL_SIZE = 40;

export enum WORLDS {
  ROOT = "root",
  BEFORE = "before",
  AFTER = "after",
}

export enum MODALS {
  STAGES = "STAGES",
  STAGE_SETTINGS = "STAGE_SETTINGS",
  EXPLORE_CHARACTERS = "EXPLORE_CHARACTERS",
  CHARACTER_Z_ORDER = "CHARACTER_Z_ORDER",
  VIDEOS = "VIDEOS",
  PUBLISH = "PUBLISH",
}

export const SPEED_OPTIONS = {
  Slow: 1000,
  Normal: 500,
  Fast: 250,
  Super: 125,
};

export enum TOOLS {
  POINTER = "pointer",
  STAMP = "stamp",
  TRASH = "trash",
  RECORD = "record",
  PAINT = "paint",
  CREATE_CHARACTER = "create-character",

  // Used in the recording flow
  IGNORE_SQUARE = "ignore-square",
  ADD_CLICK_CONDITION = "add-click-condition",
}

export enum RECORDING_PHASE {
  RECORD = "record",
}
